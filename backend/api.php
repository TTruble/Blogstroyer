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
            case 'resetPassword':
                handleResetPassword($pdo, $data);
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
        handleDeletePost($pdo, $_GET['ID'], $_GET['userId']);
    } else {
        echo json_encode(['success' => false, 'error' => 'No id or userId provided for deletion']);
    }
}

function handleResetPassword($pdo, $data) {
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
            'message' => 'Password must be at least 6 characters'
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
function handleSearchPosts($pdo, $searchQuery) {
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

function handleVerifyEmail($pdo, $data) {
    if (!isset($data['email']) || !isset($data['code'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Email and verification code are required'
        ]);
        return;
    }

    $email = trim($data['email']);
    $code = trim($data['code']);

    $stmt = $pdo->prepare("SELECT * FROM verification_codes WHERE email = ? AND code = ? AND expires_at > NOW() AND used = 0");
    $stmt->execute([$email, $code]);
    $verification = $stmt->fetch();

    if ($verification) {
        // Mark code as used
        $stmt = $pdo->prepare("UPDATE verification_codes SET used = 1 WHERE id = ?");
        $stmt->execute([$verification['id']]);

        // Update user's email verification status
        $stmt = $pdo->prepare("UPDATE users SET email_verified = 1 WHERE email = ?");
        $stmt->execute([$email]);

        echo json_encode([
            'success' => true,
            'message' => 'Email verified successfully'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Invalid or expired verification code'
        ]);
    }
}

function handleSendVerificationCode($pdo, $data) {
    if (!isset($data['email'])) {
        echo json_encode([
            'success' => false,
            'message' => 'Email is required'
        ]);
        return;
    }

    $email = trim($data['email']);
    $code = sprintf("%06d", mt_rand(0, 999999));
    $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    try {
        // Store the verification code
        $stmt = $pdo->prepare("INSERT INTO verification_codes (email, code, expires_at, used) VALUES (?, ?, ?, 0)");
        $stmt->execute([$email, $code, $expiresAt]);

        // Send the email
        if (sendVerificationEmail($email, $code)) {
            echo json_encode([
                'success' => true,
                'message' => 'Verification code sent successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to send verification email'
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error occurred'
        ]);
    }
}

function handleLogin($pdo, $data) {
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

function handleRegister($pdo, $data) {
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

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, email, email_verified, points) VALUES (?, ?, ?, 0, 0)");
        $result = $stmt->execute([$username, $hashedPassword, $email]);

        if ($result) {
            echo json_encode([
                'success' => true,
                'message' => 'User registered successfully'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Error registering user'
            ]);
        }
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'message' => 'Database error occurred'
        ]);
    }
}
function handleGetLeaderboard($pdo) {
    try {
        $stmt = $pdo->query("SELECT id, username, points FROM users ORDER BY points DESC");
        $users = $stmt->fetchAll();
        echo json_encode(['success' => true, 'users' => $users]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}

function handleCreatePost($pdo, $data) {
    if (!isset($data['title']) || !isset($data['contents']) || !isset($data['userId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }

    $title = trim($data['title']);
    $contents = trim($data['contents']);
    $userId = $data['userId'];

    $stmt = $pdo->prepare("INSERT INTO posts (title, contents, userId, destruction_count) VALUES (?, ?, ?, 0)");
    $result = $stmt->execute([$title, $contents, $userId]);

    if ($result) {
        echo json_encode(['success' => true, 'ID' => $pdo->lastInsertId()]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error creating post']);
    }
}

function handleGetSinglePost($pdo, $ID) {
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

function handleGetAllPosts($pdo, $sort = null) {
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

function handleUpdatePost($pdo, $data) {
    if (!isset($data['ID']) || !isset($data['title']) || !isset($data['contents']) || !isset($data['userId'])) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        return;
    }

    $ID = $data['ID'];
    $title = trim($data['title']);
    $contents = trim($data['contents']);
    $userId = $data['userId'];

    $stmt = $pdo->prepare("UPDATE posts SET title = ?, contents = ? WHERE ID = ? AND userId = ?");
    $result = $stmt->execute([$title, $contents, $ID, $userId]);

    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error updating post']);
    }
}

function updateUserPoints($pdo, $userId, $points) {
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    return $stmt->execute([$points, $userId]);
}

function handleDeletePost($pdo, $ID, $userId) {
    try {
        $pdo->beginTransaction();
        
        // Instead of deleting, increment the destruction counter
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
?>