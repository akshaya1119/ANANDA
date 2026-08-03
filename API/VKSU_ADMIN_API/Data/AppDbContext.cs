using Microsoft.EntityFrameworkCore;
using VKSU_ADMIN_API.Models;

namespace VKSU_ADMIN_API.Data
{
    public class AppDbContext : DbContext   // ✅ MUST inherit
    {
        // ✅ Constructor required for DI
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        // ✅ Tables
        public DbSet<Students> Students { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Users> Users { get; set; }
        public DbSet<AdminLog> AdminLogs { get; set; }

    }
}