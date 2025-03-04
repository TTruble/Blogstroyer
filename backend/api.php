<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'config.php';
require_once 'mailer.php';


// Handle preflight requests
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
            default:
                handleCreatePost($pdo, $data);
        }
    } else {
        handleCreatePost($pdo, $data);
    }
} else if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if (isset($_GET['ID'])) {
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
        // Check if this is a game destruction or a real deletion
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

    // Check if the email exists in the database
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        // For security reasons, still return success even if email doesn't exist
        // This prevents email enumeration attacks
        echo json_encode([
            'success' => true,
            'message' => 'If your email exists in our system, you will receive a password reset code'
        ]);
        return;
    }

    // Generate a verification code
    $code = sprintf("%06d", mt_rand(0, 999999));

    // Set the timezone
    $timezone = new DateTimeZone('Europe/Riga');

    // Create a DateTime object with the current time in the specified timezone
    $now = new DateTime('now', $timezone);

    // Add 10 minutes to the current time
    $now->modify('+10 minutes');

    // Format the expiration time as a string
    $expiresAt = $now->format('Y-m-d H:i:s');

    try {
        // Store the verification code
        $stmt = $pdo->prepare("INSERT INTO verification_codes (email, code, expires_at, used) VALUES (?, ?, ?, 0)");
        $stmt->execute([$email, $code, $expiresAt]);

        // Send the email
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
        // Mark code as used
        $stmt = $pdo->prepare("UPDATE verification_codes SET used = 1 WHERE id = ?");
        $stmt->execute([$verification['id']]);

        // Update password
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

    // Debugging: Log the received data
    error_log("Received data in handleVerifyEmail: " . json_encode($data));

    // Debugging: Log the SQL query
    $sql = "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0";
    error_log("SQL query: " . $sql);

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$email, $code]);
    $verification = $stmt->fetch();

    if ($verification) {
        // Debugging: Log the verification data
        error_log("Verification code found in database: " . json_encode($verification));

        // Debugging: Log the generated code and the entered code
        error_log("Generated code: " . $verification['code']);
        error_log("Entered code: " . $code);

        // Strict comparison
        if ($verification['code'] === $code) {
            // Mark code as used
            $stmt = $pdo->prepare("UPDATE verification_codes SET used = 1 WHERE id = ?");
            $stmt->execute([$verification['id']]);

            // Hash the password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Create the user account
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

    // Set the timezone
    $timezone = new DateTimeZone('Europe/Riga'); // Replace with your desired timezone

    // Create a DateTime object with the current time in the specified timezone
    $now = new DateTime('now', $timezone);

    // Add 10 minutes to the current time
    $now->modify('+10 minutes');

    // Format the expiration time as a string
    $expiresAt = $now->format('Y-m-d H:i:s');

    // Debugging: Log the generated code and expiration time
    error_log("Generated code: " . $code);
    error_log("Expiration time: " . $expiresAt);

    try {
        // Store the verification code
        $stmt = $pdo->prepare("INSERT INTO verification_codes (email, code, expires_at, used) VALUES (?, ?, ?, 0)");
        $stmt->execute([$email, $code, $expiresAt]);

        // Send the email
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

        // At this point, the username and email are unique.
        // We will NOT create the user account yet.  Instead, we send the verification code.

        $verificationResult = handleSendVerificationCode($pdo, ['email' => $email]); // Call handleSendVerificationCode
        $verificationData = json_decode($verificationResult, true);

        if ($verificationData['success']) {
            // Verification code sent successfully
            echo json_encode([
                'success' => true,
                'message' => 'Verification code sent successfully. Please check your email.',
                'verification_required' => true,
                'email' => $email // Pass the email back to the client
            ]);
        } else {
            // Failed to send verification code
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

    // Handle image upload
    $imagePath = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['image']['tmp_name'];
        $fileName = $_FILES['image']['name'];
        $fileSize = $_FILES['image']['size'];
        $fileType = $_FILES['image']['type'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;

        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');

        if (in_array($fileExtension, $allowedfileExtensions)) {
            $uploadDirectory = 'uploads/';
            if (!is_dir($uploadDirectory)) {
                mkdir($uploadDirectory, 0777, true);
            }
            $dest_path = $uploadDirectory . $newFileName;

            if (move_uploaded_file($fileTmpPath, $dest_path)) {
                $imagePath = $dest_path;
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to upload image']);
                return;
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid image format']);
            return;
        }
    }

    $stmt = $pdo->prepare("INSERT INTO posts (title, contents, userId, image_path, destruction_count) VALUES (?, ?, ?, ?, 0)");
    $result = $stmt->execute([$title, $contents, $userId, $imagePath]);

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

        // Check if user already has this item
        $stmt = $pdo->prepare("SELECT id FROM user_inventory WHERE user_id = ? AND item_id = ?");
        $stmt->execute([$userId, $itemId]);
        if ($stmt->fetch()) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'You already own this item']);
            return;
        }

        // Get item price
        $stmt = $pdo->prepare("SELECT price FROM shop_items WHERE id = ?");
        $stmt->execute([$itemId]);
        $item = $stmt->fetch();

        if (!$item) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'Item not found']);
            return;
        }

        // Check if user has enough points
        $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user['points'] < $item['price']) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => 'Not enough points']);
            return;
        }

        // Deduct points
        $stmt = $pdo->prepare("UPDATE users SET points = points - ? WHERE id = ?");
        $stmt->execute([$item['price'], $userId]);

        // Add item to inventory
        $stmt = $pdo->prepare("INSERT INTO user_inventory (user_id, item_id, equipped) VALUES (?, ?, FALSE)");
        $stmt->execute([$userId, $itemId]);

        // Get updated user points
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

        // Get the item type
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

        // Unequip any currently equipped items of the same type
        $stmt = $pdo->prepare("
            UPDATE user_inventory ui
            JOIN shop_items si ON ui.item_id = si.id
            SET ui.equipped = FALSE
            WHERE ui.user_id = ? AND si.type = ? AND ui.equipped = TRUE
        ");
        $stmt->execute([$userId, $item['type']]);

        // Equip the selected item
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
    $orderBy = "posts.ID DESC"; // Default sorting (newest first)

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

    // Handle image upload
    $imagePath = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $fileTmpPath = $_FILES['image']['tmp_name'];
        $fileName = $_FILES['image']['name'];
        $fileNameCmps = explode(".", $fileName);
        $fileExtension = strtolower(end($fileNameCmps));

        $newFileName = md5(time() . $fileName) . '.' . $fileExtension;

        $allowedfileExtensions = array('jpg', 'gif', 'png', 'jpeg');

        if (in_array($fileExtension, $allowedfileExtensions)) {
            $uploadDirectory = 'uploads/';
            $dest_path = $uploadDirectory . $newFileName;

            if (move_uploaded_file($fileTmpPath, $dest_path)) {
                $imagePath = $dest_path;
            } else {
                echo json_encode(['success' => false, 'error' => 'Failed to upload image']);
                return;
            }
        } else {
            echo json_encode(['success' => false, 'error' => 'Invalid image format']);
            return;
        }
    }

    // Update post data, including image path if a new image was uploaded
    if ($imagePath) {
        $stmt = $pdo->prepare("UPDATE posts SET title = ?, contents = ?, image_path = ? WHERE ID = ? AND userId = ?");
        $result = $stmt->execute([$title, $contents, $imagePath, $ID, $userId]);
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
        // First check if the user owns this post
        $stmt = $pdo->prepare("SELECT userId FROM posts WHERE ID = ?");
        $stmt->execute([$ID]);
        $post = $stmt->fetch();
        
        if (!$post || $post['userId'] != $userId) {
            echo json_encode(['success' => false, 'error' => "You don't have permission to delete this post"]);
            return;
        }
        
        // Actually delete the post
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

        // Increment the destruction counter
        $stmt = $pdo->prepare("UPDATE posts SET destruction_count = destruction_count + 1 WHERE ID = ?");
        $result = $stmt->execute([$ID]);

        if ($result) {
            // Award points for the destruction
            updateUserPoints($pdo, $userId, 10);

            // Get updated user points
            $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            // Get updated destruction count
            $stmt = $pdo->prepare("SELECT destruction_count FROM posts WHERE ID = ?");
            $stmt->execute([$ID]);
            $post = $stmt->fetch();

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => "Post destruction count updated",
                'newPoints' => $user['points'],
                'destructionCount' => $post['destruction_count']
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