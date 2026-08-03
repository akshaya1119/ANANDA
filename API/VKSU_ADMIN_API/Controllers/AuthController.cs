
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using VKSU_ADMIN_API.Data;
using VKSU_ADMIN_API.Models;

namespace VKSU_ADMIN_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.UserName) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { Message = "Username and Password are required." });
            }

            // Seed default admin if the Users table is empty
            if (!_context.Users.Any())
            {
                var defaultAdmin = new Users
                {
                    UserId = Guid.NewGuid().ToString(),
                    FullName = "System Administrator",
                    UserName = "admin",
                    Password = "Admin@123", // In production we would hash this, but matching schema design
                    Status = true
                };
                _context.Users.Add(defaultAdmin);
                _context.SaveChanges();
            }

            // Find user (case-insensitive for username)
            var user = _context.Users.FirstOrDefault(u => u.UserName.ToLower() == request.UserName.ToLower());

            if (user == null || user.Password != request.Password)
            {
                return Unauthorized(new { Message = "Invalid username or password." });
            }

            if (!user.Status)
            {
                return Unauthorized(new { Message = "This account is inactive. Please contact your administrator." });
            }

            // Generate JWT Token
            var tokenHandler = new JwtSecurityTokenHandler();
            var secretKey = _configuration["JwtSettings:SecretKey"] ?? "your-secret-key-of-at-least-32-characters-length-for-256-bits";
            var key = Encoding.UTF8.GetBytes(secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.UserId),
                    new Claim(ClaimTypes.Name, user.UserName),
                    new Claim("FullName", user.FullName)
                }),
                Expires = DateTime.UtcNow.AddDays(1),
                Issuer = _configuration["JwtSettings:Issuer"],
                Audience = _configuration["JwtSettings:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            return Ok(new
            {
                Token = tokenString,
                User = new
                {
                    user.UserId,
                    user.UserName,
                    user.FullName,
                    user.Status
                }
            });
        }
    }

    public class LoginRequest
    {
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
