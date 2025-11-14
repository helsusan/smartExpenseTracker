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
                <p>Let's get back to tracking your expenses.</p>
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
                            <input type="email" id="email" name="email" placeholder="e.g. finance@company.com" required>
                        </div>
                    </div>

                    <div class="input-group">
                        <label>Password</label>
                        <div class="input-wrapper">
                            <span class="material-icons">lock</span>
                            <input type="password" id="password" name="password" placeholder="••••••••" required>
                        </div>
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