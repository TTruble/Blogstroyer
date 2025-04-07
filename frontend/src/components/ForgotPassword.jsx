import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      const response = await axios.post('https://blogstroyer.alwaysdata.net/backend/api.php', {
        action: 'forgotPassword',
        email
      });
      
      if (response.data.success) {
        setStep(2);
        setMessage('Verification code sent to your email');
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      const response = await axios.post('https://blogstroyer.alwaysdata.net/backend/api.php', {
        action: 'resetPassword',
        email,
        code,
        newPassword
      });
      
      if (response.data.success) {
        setMessage('Password reset successfully');
        setStep(3);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      console.error('Error:', error);
    }   
  };

  return (
    <div className="auth-container">
      <h2>Reset Password</h2>
      
      {step === 1 && (
        <form onSubmit={handleSendCode}>
          <p>Enter your email address to receive a password reset code</p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit">Send Reset Code</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleResetPassword}>
          <p>Enter the verification code sent to your email and your new password</p>
          <input
            type="text"
            placeholder="Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="6"
          />
          <button type="submit">Reset Password</button>
        </form>
      )}

      {step === 3 && (
        <div className="success-container">
          <p className="success">Your password has been reset successfully!</p>
          <button onClick={() => navigate('/login')}>Return to Login</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      
      <div className="auth-links">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
