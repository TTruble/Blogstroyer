<?php

use SendinBlue\Client\Api\TransactionalEmailsApi;
use SendinBlue\Client\Configuration;
use SendinBlue\Client\Model\SendSmtpEmail;

require_once '../vendor/autoload.php';

function sendVerificationEmail($email, $code) {
    $config = Configuration::getDefaultConfiguration()
        ->setApiKey('api-key', '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');
    
    $apiInstance = new TransactionalEmailsApi(
        new GuzzleHttp\Client(),
        $config
    );
    
    $sendSmtpEmail = new SendSmtpEmail();
    $sendSmtpEmail['to'] = [['email' => $email]];
    $sendSmtpEmail['sender'] = ['name' => 'BLOGSTROYER', 'email' => 'blazingaustin@gmail.com'];
    $sendSmtpEmail['subject'] = 'Email Verification Code';
    $sendSmtpEmail['htmlContent'] = "Your verification code is: <b>$code</b>";
    
    try {
        $apiInstance->sendTransacEmail($sendSmtpEmail);
        return true;
    } catch (Exception $e) {
        print_r($e);

        return false;
    }
}

function sendPasswordResetEmail($email, $code) {
    $config = Configuration::getDefaultConfiguration()
        ->setApiKey('api-key', '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');
    
    $apiInstance = new TransactionalEmailsApi(
        new GuzzleHttp\Client(),
        $config
    );
    
    $sendSmtpEmail = new SendSmtpEmail();
    $sendSmtpEmail['to'] = [['email' => $email]];
    $sendSmtpEmail['sender'] = ['name' => 'BLOGSTROYER', 'email' => 'blazingaustin@gmail.com'];
    $sendSmtpEmail['subject'] = 'Password Reset Code';
    $sendSmtpEmail['htmlContent'] = "Your password reset code is: <b>$code</b>";
    
    try {
        $apiInstance->sendTransacEmail($sendSmtpEmail);
        return true;
    } catch (Exception $e) {
        return false;
    }
}
?>