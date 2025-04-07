<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'config.php';
require_once 'mailer.php';



if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (isset($data['action'])) {
        switch ($data['action']) {
            case 'login':
                handleLogin($pdo, $data);
                break;
            case 'register':
                handleRegister($pdo, $data);
                break;
            case 'getLeaderboard':
                handleGetLeaderboard($pdo);
                break;
            case 'sendVerificationCode':
                handleSendVerificationCode($pdo, $data);
                break;
            case 'verifyEmail':
                handleVerifyEmail($pdo, $data);
                break;
            case 'forgotPassword':
                handleForgotPassword($pdo, $data);
                break;

            case 'resetPassword':
                handleResetPassword($pdo, $data);
                break;
            case 'getShopItems':
                handleGetShopItems($pdo);
                break;
            case 'getUserInventory':
                handleGetUserInventory($pdo, $data);
                break;
            case 'purchaseItem':
                handlePurchaseItem($pdo, $data);
                break;
            case 'equipItem':
                handleEquipItem($pdo, $data);
                break;
            case 'unequipItem':
                handleUnequipItem($pdo, $data);
                break;
                case 'getProfile':
                    handleGetProfile($pdo, $data);
                    break;
                case 'updateProfile':
                    handleUpdateProfile($pdo, $data);
                    break;
            default:
                handleCreatePost($pdo, $data);
        }
    } else {
        handleCreatePost($pdo, $data);
    }
} else if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (isset($_GET['image'])) {
        handleGetImage($pdo, $_GET['image']);

    } else if (isset($_GET['ID'])) {
        handleGetSinglePost($pdo, $_GET['ID']);
    } else if (isset($_GET['search'])) {
        handleSearchPosts($pdo, $_GET['search']);
    } else {
        $sort = isset($_GET['sort']) ? $_GET['sort'] : null;
        handleGetAllPosts($pdo, $sort);
    }
} else if ($_SERVER['REQUEST_METHOD'] == 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    handleUpdatePost($pdo, $data);
} else if ($_SERVER['REQUEST_METHOD'] == 'DELETE') {
    if (isset($_GET['ID']) && isset($_GET['userId'])) {

        if (isset($_GET['gameMode']) && $_GET['gameMode'] === 'true') {
            handleDestroyPost($pdo, $_GET['ID'], $_GET['userId']);
        } else {
            handleDeletePost($pdo, $_GET['ID'], $_GET['userId']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No id or userId provided for deletion']);
    }
}

function handleForgotPassword($pdo, $data) {
    if (!isset($data['email'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Email is required'
        ]);
        return;
    }

    $email = trim($data['email']);

    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        echo json_encode([
            'success' => true,
            'message' => 'If your email exists in our system, you will receive a password reset code'
        ]);
        return;
    }

    $code = sprintf("%06d", mt_rand(0, 999999));

    $timezone = new DateTimeZone('Europe/Riga');


    $now = new DateTime('now', $timezone);

    $now->modify('+10 minutes');

    $expiresAt = $now->format('Y-m-d H:i:s');

    try {
        $stmt = $pdo->prepare("INSERT INTO verification_codes (email, code, expires_at, used) VALUES (?, ?, ?, 0)");
        $stmt->execute([$email, $code, $expiresAt]);

        if (sendPasswordResetEmail($email, $code)) {
            echo json_encode([
                'success' => true,
                'message' => 'Password reset code sent successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to send password reset email'
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error occurred'
        ]);
    }
}


function handleResetPassword($pdo, $data)
{
    if (!isset($data['email']) || !isset($data['code']) || !isset($data['newPassword'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Email, verification code, and new password are required'
        ]);
        return;
    }
    $email = trim($data['email']);
    $code = trim($data['code']);
    $newPassword = trim($data['newPassword']);

    if (strlen($newPassword) < 6) {
        echo json_encode([
            'success' => false,
            'message' => 'Password must be at least 6 characters long'
        ]);
        return;
    }

    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0");
    $stmt->execute([$email, $code]);
    $verification = $stmt->fetch();

    if ($verification) {
        $stmt = $pdo->prepare("UPDATE verification_codes SET used = 1 WHERE id = ?");
        $stmt->execute([$verification['id']]);

        $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
        $stmt->execute([$hashedPassword, $email]);

        echo json_encode([
            'success' => true,
            'message' => 'Password reset successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired verification code'
        ]);
    }
}

function handleSearchPosts($pdo, $searchQuery)
{
    $searchQuery = "%$searchQuery%";
    $stmt = $pdo->prepare("
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.userId = users.id 
        WHERE posts.title LIKE ? OR posts.contents LIKE ?
        ORDER BY posts.ID DESC
    ");
    $stmt->execute([$searchQuery, $searchQuery]);
    $posts = $stmt->fetchAll();
    echo json_encode(['success' => true, 'posts' => $posts]);
}

function handleVerifyEmail($pdo, $data)
{
    if (!isset($data['email']) || !isset($data['code']) || !isset($data['username']) || !isset($data['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Email, verification code, username and password are required'
        ]);
        return;
    }

    $email = trim($data['email']);
    $code = trim($data['code']);
    $username = trim($data['username']);
    $password = trim($data['password']);

    error_log("Received data in handleVerifyEmail: " . json_encode($data));

    $sql = "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0";
    error_log("SQL query: " . $sql);

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$email, $code]);
    $verification = $stmt->fetch();

    if ($verification) {
        error_log("Verification code found in database: " . json_encode($verification));

        error_log("Generated code: " . $verification['code']);
        error_log("Entered code: " . $code);

        if ($verification['code'] === $code) {
            $stmt = $pdo->prepare("UPDATE verification_codes SET used = 1 WHERE id = ?");
            $stmt->execute([$verification['id']]);

            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            try {
                $stmt = $pdo->prepare("INSERT INTO users (username, password, email, email_verified, points) VALUES (?, ?, ?, 1, 0)");
                $result = $stmt->execute([$username, $hashedPassword, $email]);

                if ($result) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Email verified and account created successfully'
                    ]);
                } else {
                    error_log("Error creating user account");
                    echo json_encode([
                        'success' => false,
                        'message' => 'Error creating user account'
                    ]);
                }
            } catch (PDOException $e) {
                error_log("Database error occurred while creating account: " . $e->getMessage());
                echo json_encode([
                    'success' => false,
                    'message' => 'Database error occurred while creating account'
                ]);
            }
        } else {
            error_log("Codes do not match");
            echo json_encode([
                'success' => false,
                'message' => 'Invalid or expired verification code'
            ]);
        }
    } else {
        error_log("Invalid or expired verification code");
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired verification code'
        ]);
    }
}

function handleSendVerificationCode($pdo, $data)
{
    if (!isset($data['email'])) {
        return json_encode([
            'success' => false,
            'message' => 'Email is required'
        ]);
    }

    $email = trim($data['email']);
    $code = sprintf("%06d", mt_rand(0, 999999));

    $timezone = new DateTimeZone('Europe/Riga');

    $now = new DateTime('now', $timezone);

    $now->modify('+10 minutes');

    $expiresAt = $now->format('Y-m-d H:i:s');

    error_log("Generated code: " . $code);
    error_log("Expiration time: " . $expiresAt);

    try {
        $stmt = $pdo->prepare("INSERT INTO verification_codes (email, code, expires_at, used) VALUES (?, ?, ?, 0)");
        $stmt->execute([$email, $code, $expiresAt]);

        if (sendVerificationEmail($email, $code)) {
            return json_encode([
                'success' => true,
                'message' => 'Verification code sent successfully'
            ]);
        } else {
            return json_encode([
                'success' => false,
                'message' => 'Failed to send verification email'
            ]);
        }
    } catch (PDOException $e) {
        return json_encode([
            'success' => false,
            'message' => 'Database error occurred'
        ]);
    }
}

function handleLogin($pdo, $data)
{
    if (!isset($data['username']) || !isset($data['password'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Username and password are required'
        ]);
        return;
    }

    $username = trim($data['username']);
    $password = trim($data['password']);

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'points' => $user['points']
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid username or password'
        ]);
    }
}

function handleRegister($pdo, $data)
{
    if (!isset($data['username']) || !isset($data['password']) || !isset($data['email'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Username, password, and email are required'
        ]);
        return;
    }

    $username = trim($data['username']);
    $password = trim($data['password']);
    $email = trim($data['email']);

    if (strlen($username) < 3 || strlen($password) < 6) {
        echo json_encode([
            'success' => false,
            'message' => 'Username must be at least 3 characters and password at least 6 characters'
        ]);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        $existingUser = $stmt->fetch();

        if ($existingUser) {
            echo json_encode([
                'success' => false,
                'message' => 'Username or email already exists'
            ]);
            return;
        }


        $verificationResult = handleSendVerificationCode($pdo, ['email' => $email]); 
        $verificationData = json_decode($verificationResult, true);

        if ($verificationData['success']) {
            echo json_encode([
                'success' => true,
                'message' => 'Verification code sent successfully. Please check your email.',
                'verification_required' => true,
                'email' => $email 
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to send verification email. Please try again.',
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error occurred'
        ]);
    }
}


function handleGetLeaderboard($pdo)
{
    try {
        $stmt = $pdo->query("SELECT id, username, points FROM users ORDER BY points DESC");
        $users = $stmt->fetchAll();
        echo json_encode(['success' => true, 'users' => $users]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}

function handleCreatePost($pdo, $data)
{
    if (!isset($_POST['title']) || !isset($_POST['contents']) || !isset($_POST['userId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }

    $title = trim($_POST['title']);
    $contents = trim($_POST['contents']);
    $userId = $_POST['userId'];

    $imageData = null;
    $imageType = null;
    
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['image']['tmp_name'];
        $fileType = $_FILES['image']['type'];
        $fileSize = $_FILES['image']['size'];
        $fileExtension = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));

        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');

        if (in_array($fileExtension, $allowedfileExtensions)) {
            $imageData = file_get_contents($fileTmpPath);
            $imageType = $fileType;
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid image format']);
            return;
        }
    }

    $stmt = $pdo->prepare("INSERT INTO posts (title, contents, userId, image_data, image_type, destruction_count) VALUES (?, ?, ?, ?, ?, 0)");
    $result = $stmt->execute([$title, $contents, $userId, $imageData, $imageType]);

    if ($result) {
        echo json_encode(['success' => true, 'ID' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error creating post']);
    }
}


function handleGetShopItems($pdo)
{
    try {
        $stmt = $pdo->query("SELECT * FROM shop_items ORDER BY price ASC");
        $items = $stmt->fetchAll();
        echo json_encode(['success' => true, 'items' => $items]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}

function handleGetUserInventory($pdo, $data)
{
    if (!isset($data['userId'])) {
        echo json_encode(['success' => false, 'error' => 'User ID is required']);
        return;
    }

    $userId = $data['userId'];

    try {
        $stmt = $pdo->prepare("
            SELECT ui.*, si.name, si.description, si.type, si.data 
            FROM user_inventory ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.user_id = ?
        ");
        $stmt->execute([$userId]);
        $inventory = $stmt->fetchAll();
        echo json_encode(['success' => true, 'inventory' => $inventory]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}

function handlePurchaseItem($pdo, $data)
{
    if (!isset($data['userId']) || !isset($data['itemId'])) {
        echo json_encode(['success' => false, 'error' => 'User ID and Item ID are required']);
        return;
    }

    $userId = $data['userId'];
    $itemId = $data['itemId'];

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?");
        $stmt->execute([$userId, $itemId]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'You already own this item']);
            return;
        }

        $stmt = $pdo->prepare("SELECT price FROM shop_items WHERE id = ?");
        $stmt->execute([$itemId]);
        $item = $stmt->fetch();

        if (!$item) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'Item not found']);
            return;
        }

        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user['points'] < $item['price']) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'Not enough points']);
            return;
        }

        $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
        $stmt->execute([$item['price'], $userId]);

        $stmt = $pdo->prepare("INSERT INTO user_inventory (user_id, item_id, equipped) VALUES (?, ?, FALSE)");
        $stmt->execute([$userId, $itemId]);

        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $updatedUser = $stmt->fetch();

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Item purchased successfully',
            'newPoints' => $updatedUser['points']
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}

function handleEquipItem($pdo, $data)
{
    if (!isset($data['userId']) || !isset($data['inventoryId'])) {
        echo json_encode(['success' => false, 'error' => 'User ID and Inventory ID are required']);
        return;
    }

    $userId = $data['userId'];
    $inventoryId = $data['inventoryId'];

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            SELECT si.type 
            FROM user_inventory ui
            JOIN shop_items si ON ui.item_id = si.id
            WHERE ui.id = ? AND ui.user_id = ?
        ");
        $stmt->execute([$inventoryId, $userId]);
        $item = $stmt->fetch();

        if (!$item) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'Item not found in your inventory']);
            return;
        }

        $stmt = $pdo->prepare("
            UPDATE user_inventory ui
            JOIN shop_items si ON ui.item_id = si.id
            SET ui.equipped = FALSE
            WHERE ui.user_id = ? AND si.type = ? AND ui.equipped = TRUE
        ");
        $stmt->execute([$userId, $item['type']]);

        $stmt = $pdo->prepare("UPDATE user_inventory SET equipped = TRUE WHERE id = ? AND user_id = ?");
        $stmt->execute([$inventoryId, $userId]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Item equipped successfully'
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}

function handleUnequipItem($pdo, $data)
{
    if (!isset($data['userId']) || !isset($data['inventoryId'])) {
        echo json_encode(['success' => false, 'error' => 'User ID and Inventory ID are required']);
        return;
    }

    $userId = $data['userId'];
    $inventoryId = $data['inventoryId'];

    try {
        $stmt = $pdo->prepare("UPDATE user_inventory SET equipped = FALSE WHERE id = ? AND user_id = ?");
        $stmt->execute([$inventoryId, $userId]);

        echo json_encode([
            'success' => true,
            'message' => 'Item unequipped successfully'
        ]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}


function handleGetSinglePost($pdo, $ID)
{
    $stmt = $pdo->prepare("
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.userId = users.id 
        WHERE posts.ID = ?
    ");
    $stmt->execute([$ID]);
    $post = $stmt->fetch();

    if ($post) {
        echo json_encode(['success' => true, 'post' => $post]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Post not found']);
    }
}

function handleGetAllPosts($pdo, $sort = null)
{
    $orderBy = "posts.ID DESC"; 

    if ($sort === 'most_destruction') {
        $orderBy = "posts.destruction_count DESC";
    } else if ($sort === 'least_destruction') {
        $orderBy = "posts.destruction_count ASC";
    } else if ($sort === 'oldest') {
        $orderBy = "posts.ID ASC";
    } else if ($sort === 'newest') {
        $orderBy = "posts.ID DESC";
    }

    $stmt = $pdo->prepare("
        SELECT posts.*, users.username, posts.destruction_count 
        FROM posts 
        JOIN users ON posts.userId = users.id
        ORDER BY $orderBy
    ");
    $stmt->execute();
    $posts = $stmt->fetchAll();
    echo json_encode(['success' => true, 'posts' => $posts]);
}

function handleUpdatePost($pdo, $data)
{
    if (!isset($_POST['ID']) || !isset($_POST['title']) || !isset($_POST['contents']) || !isset($_POST['userId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }

    $ID = $_POST['ID'];
    $title = trim($_POST['title']);
    $contents = trim($_POST['contents']);
    $userId = $_POST['userId'];

    $imageData = null;
    $imageType = null;
    
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['image']['tmp_name'];
        $fileType = $_FILES['image']['type'];
        $fileExtension = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));

        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');

        if (in_array($fileExtension, $allowedfileExtensions)) {
            $imageData = file_get_contents($fileTmpPath);
            $imageType = $fileType;
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid image format']);
            return;
        }
    }

    if ($imageData) {
        $stmt = $pdo->prepare("UPDATE posts SET title = ?, contents = ?, image_data = ?, image_type = ? WHERE ID = ? AND userId = ?");
        $result = $stmt->execute([$title, $contents, $imageData, $imageType, $ID, $userId]);
    } else {
        $stmt = $pdo->prepare("UPDATE posts SET title = ?, contents = ? WHERE ID = ? AND userId = ?");
        $result = $stmt->execute([$title, $contents, $ID, $userId]);
    }

    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error updating post']);
    }
}




function updateUserPoints($pdo, $userId, $points)
{
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    return $stmt->execute([$points, $userId]);
}

function handleDeletePost($pdo, $ID, $userId)
{
    try {

        $stmt = $pdo->prepare("SELECT userId FROM posts WHERE ID = ?");
        $stmt->execute([$ID]);
        $post = $stmt->fetch();
        
        if (!$post || $post['userId'] != $userId) {
            echo json_encode(['success' => false, 'error' => "You don't have permission to delete this post"]);
            return;
        }
        $stmt = $pdo->prepare("DELETE FROM posts WHERE ID = ? AND userId = ?");
        $result = $stmt->execute([$ID, $userId]);

        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => "Post deleted successfully"
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => "Failed to delete post"]);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}


function handleDestroyPost($pdo, $ID, $userId)
{
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("SELECT destruction_count FROM posts WHERE ID = ?");
        $stmt->execute([$ID]);
        $post = $stmt->fetch();
        
        $destructioncount = $post['destruction_count'] +1 ?? 0;

        $stmt = $pdo->prepare("UPDATE posts SET destruction_count = $destructioncount WHERE ID = ?");
        $result = $stmt->execute([$ID]);

        if ($result) {
            updateUserPoints($pdo, $userId, 10);
            $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => "Post destruction count updated",
                'newPoints' => $user['points'],
                'destructionCount' => 1
            ]);
        } else {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => "Failed to update destruction count"]);
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}
function handleGetProfile($pdo, $data)
{
    error_log("handleGetProfile received data: " . json_encode($data));

    if (!isset($data['userId']) || empty($data['userId'])) {
        error_log("handleGetProfile error: userId is missing or empty");
        echo json_encode([
            'success' => false,
            'message' => 'User ID is required'
        ]);
        return;
    }

    $userId = intval($data['userId']);
    error_log("handleGetProfile processing userId: " . $userId);

    try {
        $stmt = $pdo->prepare("SELECT id, username, bio, image_path, image_type FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user) {
            $profile = [
                'id' => $user['id'],
                'username' => $user['username'],
                'bio' => $user['bio'] ?? '',
                'image_path' => $user['image_path'] ?? null,
                'image_type' => $user['image_type'] ?? null
            ];

            error_log("handleGetProfile success for userId: " . $userId);
            echo json_encode([
                'success' => true,
                'user' => $profile
            ]);
        } else {
            error_log("handleGetProfile error: User not found for userId: " . $userId);
            echo json_encode([
                'success' => false,
                'message' => 'User profile not found'
            ]);
        }
    } catch (PDOException $e) {
        error_log("handleGetProfile database error: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}

function handleUpdateProfile($pdo, $data)
{
    if (!isset($data['userId'])) {
        echo json_encode([
            'success' => false,
            'message' => 'User ID is required'
        ]);
        return;
    }

    $userId = $data['userId'];
    $bio = isset($data['bio']) ? trim($data['bio']) : null;

    $imagePath = null;
    $imageType = null;

    if (isset($_FILES['profile_picture']) && $_FILES['profile_picture']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['profile_picture']['tmp_name'];
        $fileType = $_FILES['profile_picture']['type'];
        $fileExtension = strtolower(pathinfo($_FILES['profile_picture']['name'], PATHINFO_EXTENSION));

        $allowedExtensions = ['jpg', 'jpeg', 'png', 'gif'];

        if (in_array($fileExtension, $allowedExtensions)) {
            // Generate a unique filename
            $newFilename = uniqid('', true) . '.' . $fileExtension;

            // Define the upload directory
            $uploadDirectory = 'uploads/profile_pictures/';  // Ensure this directory exists and is writable

            $imagePath = $uploadDirectory . $newFilename;

            if (move_uploaded_file($fileTmpPath, $imagePath)) {
                // File uploaded successfully
                // You may want to resize and optimize image here
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to upload profile picture'
                ]);
                return;
            }
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Invalid image format'
            ]);
            return;
        }
    }

    try {
        if ($imagePath !== null) {
            $stmt = $pdo->prepare("UPDATE users SET bio = ?, image_path = ?, image_type = ? WHERE id = ?");
            $result = $stmt->execute([$bio, $imagePath, $fileType, $userId]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET bio = ? WHERE id = ?");
            $result = $stmt->execute([$bio, $userId]);
        }

        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Unable to update profile'
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ]);
    }
}

function handleGetImage($pdo, $postId) {
    $stmt = $pdo->prepare("SELECT image_data, image_type FROM posts WHERE ID = ?");
    $stmt->execute([$postId]);
    $image = $stmt->fetch();
    
    if ($image && $image['image_data']) {
        header("Content-Type: " . $image['image_type']);
        echo $image['image_data'];
        exit;
    } else {
        http_response_code(404);
        echo "Image not found";
        exit;
    }
}
