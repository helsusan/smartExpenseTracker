<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Smart Expense Tracker</title>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <link rel="stylesheet" href="login_style.css">
</head>
<body>

    <div class="main-container">
        
        <div class="left-panel">
            
            <div class="finance-bg">
                <div class="chart-bar c1"></div>
                <div class="chart-bar c2"></div>
                <div class="chart-bar c3"></div>
                <div class="chart-bar c4"></div>
                <div class="chart-bar c5"></div>
            </div>

            <div class="mascot-container">
                <div class="mascot">
                    <div class="hair"></div>
                    <div class="face">
                        <div class="glasses">
                            <div class="glass-lens left">
                                <div class="pupil"></div>
                            </div>
                            <div class="bridge"></div>
                            <div class="glass-lens right">
                                <div class="pupil"></div>
                            </div>
                        </div>
                        <div class="mouth"></div>
                        <div class="blush left"></div>
                        <div class="blush right"></div>
                    </div>
                    <div class="body-container">
                        <div class="suit"></div>
                        <div class="shirt-collar"></div>
                        <div class="tie-knot"></div>
                        <div class="tie-long"></div>
                    </div>
                </div>
            </div>

            <div class="welcome-text">
                <h2>Welcome Back!</h2>
                <p>Ready to manage your wealth?</p>
            </div>
        </div>

        <div class="right-panel">
            <div class="form-content">
                <div class="header-form">
                    <h2>Sign In</h2>
                    <p>Please enter your details.</p>
                </div>
                
                <form id="login-form" method="POST" action="login_process.php">
                    
                    <div class="input-group">
                        <label>Email Address</label>
                        <div class="input-wrapper">
                            <span class="material-icons">email</span>
                            <input type="email" id="email" name="email" placeholder="finance@company.com" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>Password</label>
                        <div class="input-wrapper">
                            <span class="material-icons">lock</span>
                            <input type="password" id="password" name="password" placeholder="••••••••" required>
                        </div>
                    </div>

                    <div class="actions">
                        <label class="checkbox-container">
                            <input type="checkbox" name="remember">
                            Remember me
                        </label>
                        <a href="#" class="forgot-link">Forgot Password?</a>
                    </div>

                    <button type="submit" class="btn-primary">Sign In</button>

                    <div class="separator">
                        <span>Don't have an account? <a href="sign_up.php">Sign Up</a></span>
                    </div>
                </form>
            </div>
        </div>

    </div>

    <script src="login_script.js"></script>
</body>
</html>