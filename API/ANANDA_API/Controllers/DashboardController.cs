using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ANANDA_API.Data;
using ANANDA_API.Models;

namespace ANANDA_API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // Enforce JWT auth
    public class DashboardController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

       
       
    
    }
}
