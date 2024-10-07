<?php 
// api.php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type");

require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    if(isset($_GET['ID'])) {
        $ID = $_GET['ID'];
        $stmt = $pdo->prepare("SELECT * FROM posts WHERE ID = ?");
        $stmt->execute([$ID]);
        $post = $stmt->fetch();
        echo json_encode($post);
    } else {
        $stmt = $pdo->query("SELECT * FROM posts");
        $posts = $stmt->fetchAll();
        echo json_encode($posts);
    }
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $title = $data['title'];
    $contents = $data['contents'];

    $stmt = $pdo->prepare("INSERT INTO posts (title, contents) VALUES (?, ?)");
    $stmt->execute([$title, $contents]);
    echo json_encode(['ID' => $pdo->lastInsertId()]);
} else if ($_SERVER['REQUEST_METHOD'] == 'PUT') {
    $data = json_decode(file_get_contents('php://input'), true);
    $ID = $data['ID'];
    $title = $data['title'];
    $contents = $data['contents'];
    $stmt = $pdo->prepare("UPDATE posts SET title = ?, contents = ? WHERE ID = ?");
    $stmt->execute([$title, $contents, $ID]);
    echo json_encode(['success' => true]);
} else if ($_SERVER['REQUEST_METHOD'] == 'DELETE') {
    if (isset($_GET['ID'])) {
        $ID = $_GET['ID'];
        try {
            $stmt = $pdo->prepare("DELETE FROM posts WHERE ID = ?");
            $result = $stmt->execute([$ID]);
            if ($result) {
                $message = "Post with ID $ID deleted successfully";
                echo json_encode(['success' => true, 'message' => $message]);
            } else {
                $error = "Failed to delete post with ID $ID";
                echo json_encode(['success' => false, 'error' => $error]);
            }
        } catch (PDOException $e) {
            $error = "Database error: " . $e->getMessage();
            echo json_encode(['success' => false, 'error' => $error]);
        }
    } else {
        $error = 'No id provided for deletion';
        echo json_encode(['success' => false, 'error' => $error]);
    }
}
?>