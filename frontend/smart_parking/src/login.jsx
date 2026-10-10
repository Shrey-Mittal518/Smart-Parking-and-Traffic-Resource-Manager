import smartParking from "./assets/smart-parking.png";
import './login.css';


function Login()
{
    return (
        <>
        <div>
            <div className="left-image-container">
                <img src={smartParking} alt="Smart Parking" className="logo"></img>
                

            </div>

            <div className="right-login-container">
                <h1>Welcome Back</h1>
                <p>Login to Smart Parking & Traffic Resource Manager </p>
                <form>
                   <input type="email" placeholder="Enter your email" className="email-input"></input>
                  <input type="password" placeholder="Enter your password" className="password-input"></input>
                   <input type="checkbox" className="remember-me-checkbox"></input>
                   <label htmlFor="remember-me-checkbox" className="remember-me-label">Remember me</label>
                   <a href="/forgot-password" className="forgot-password-link">Forgot password?</a>
                    <button type="submit" className="login-button">Login</button>
                </form>
            
            </div>

        </div>
        
        
        </>
    )
}

export default Login