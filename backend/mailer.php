<?php

use SendinBlue\Client\Api\TransactionalEmailsApi;
use SendinBlue\Client\Configuration;
use SendinBlue\Client\Model\SendSmtpEmail;

require_once '../vendor/autoload.php';

function sendVerificationEmail($email, $code) {
    $config = Configuration::getDefaultConfiguration()->setApiKey(
        'api-key',
        getenv('SENDIN')
    );

    $apiInstance = new TransactionalEmailsApi(new GuzzleHttp\Client(), $config);

    $sendSmtpEmail = new SendSmtpEmail();
    $sendSmtpEmail['to'] = [['email' => $email]];
    $sendSmtpEmail['sender'] = [
        'name' => 'BLOGSTROYER',
        'email' => 'blazingaustin@gmail.com',
    ];
    $sendSmtpEmail['subject'] = 'Email Verification Code';
    $sendSmtpEmail['htmlContent'] = "Your verification code is: <b>$code</b>";

    try {
        $apiInstance->sendTransacEmail($sendSmtpEmail);
        return true;
    } catch (Exception $e) {
        error_log('Sendinblue API Error: ' . $e->getMessage()); // Log the error
        return false;
    }
}

function sendPasswordResetEmail($email, $code) {
    $config = Configuration::getDefaultConfiguration()->setApiKey(
        'api-key',
        getenv('SENDIN')
    );

    $apiInstance = new TransactionalEmailsApi(new GuzzleHttp\Client(), $config);

    $sendSmtpEmail = new SendSmtpEmail();
    $sendSmtpEmail['to'] = [['email' => $email]];
    $sendSmtpEmail['sender'] = [
        'name' => 'BLOGSTROYER',
        'email' => 'blazingaustin@gmail.com',
    ];
    $sendSmtpEmail['subject'] = 'Password Reset Code';
    $sendSmtpEmail['htmlContent'] = "Your password reset code is: <b>$code</b>";

    try {
        $apiInstance->sendTransacEmail($sendSmtpEmail);
        return true;
    } catch (Exception $e) {
        error_log('Sendinblue API Error: ' . $e->getMessage()); // Log the error
        return false;
    }
}
?>
