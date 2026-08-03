using Microsoft.EntityFrameworkCore;
using ANANDA_API.Models;

namespace ANANDA_API.Data
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