<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (isset($data['action'])) {
        switch ($data['action']) {
            case 'login':
                handleLogin($pdo, $data);
                break;
            case 'register':
                handleRegister($pdo, $data);
            case 'getLeaderboard':
                  handleGetLeaderboard($pdo);
                     break;
            default:
                handleCreatePost($pdo, $data);
                
        }
    } else {
        handleCreatePost($pdo, $data);
    }
} else if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if(isset($_GET['ID'])) {
        handleGetSinglePost($pdo, $_GET['ID']);
    } else {
        handleGetAllPosts($pdo);
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

function handleLogin($pdo, $data) {
    $username = $data['username'];
    $password = $data['password'];

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

function updateUserPoints($pdo, $userId, $points) {
    $stmt = $pdo->prepare("UPDATE users SET points = points + ? WHERE id = ?");
    return $stmt->execute([$points, $userId]);
}


function handleRegister($pdo, $data) {
    $username = $data['username'];
    $password = $data['password'];

    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $existingUser = $stmt->fetch();

    if ($existingUser) {
        echo json_encode([
            'success' => false,
            'message' => 'Username already exists'
        ]);
    } else {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password, points) VALUES (?, ?, 0)");
        $result = $stmt->execute([$username, $hashedPassword]);

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
    $title = $data['title'];
    $contents = $data['contents'];
    $userId = $data['userId'];

    $stmt = $pdo->prepare("INSERT INTO posts (title, contents, userId) VALUES (?, ?, ?)");
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

function handleGetAllPosts($pdo) {
    $stmt = $pdo->query("
        SELECT posts.*, users.username 
        FROM posts 
        JOIN users ON posts.userId = users.id
    ");
    $posts = $stmt->fetchAll();
    echo json_encode(['success' => true, 'posts' => $posts]);
}

function handleUpdatePost($pdo, $data) {
    $ID = $data['ID'];
    $title = $data['title'];
    $contents = $data['contents'];
    $userId = $data['userId'];

    $stmt = $pdo->prepare("UPDATE posts SET title = ?, contents = ? WHERE ID = ? AND userId = ?");
    $result = $stmt->execute([$title, $contents, $ID, $userId]);

    if ($result) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Error updating post']);
    }
}

function handleDeletePost($pdo, $ID, $userId) {
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("DELETE FROM posts WHERE ID = ? AND userId = ?");
        $result = $stmt->execute([$ID, $userId]);
        
        if ($result) {
            updateUserPoints($pdo, $userId, 10);
            
            $stmt = $pdo->prepare("SELECT points FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            
            $pdo->commit();
            
            echo json_encode([
                'success' => true, 
                'message' => "Post with ID $ID deleted successfully",
                'newPoints' => $user['points']
            ]);
        } else {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'error' => "Failed to delete post with ID $ID"]);
        }
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => "Database error: " . $e->getMessage()]);
    }
}
?>