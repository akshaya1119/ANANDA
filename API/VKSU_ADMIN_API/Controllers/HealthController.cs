using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace VKSU_ADMIN_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous] // Exposed publicly for health checks
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetHealth()
        {
            return Ok(new
            {
                Status = "Healthy",
                Service = "VKSU Admin Portal API",
                Timestamp = DateTime.UtcNow.ToString("o"),
                Version = "1.0.0"
            });
        }
    }
}
