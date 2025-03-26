<?php
require_once '../vendor/autoload.php';

use Dotenv\Dotenv;

$projectRoot = dirname(__DIR__); 

try {
    $dotenv = Dotenv::createImmutable($projectRoot);
    $dotenv->load();
} catch (\Dotenv\Exception\InvalidPathException $e) {
    die("Error: .env file not found. Please create one in the project root: " . $projectRoot);
}

date_default_timezone_set('Europe/Riga');
$host = $_ENV['DB_HOST'] ?: 'localhost';
$db = $_ENV['DB_NAME'] ?: 'blogstroyer';
$user = $_ENV['DB_USER'] ?: 'root';
$pass = $_ENV['DB_PASS'] ?: '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->query("SELECT 1");
} catch (\PDOException $e) {
    error_log("Database connection error: " . $e->getMessage());
    die("Database connection failed: " . $e->getMessage());
}
?>
