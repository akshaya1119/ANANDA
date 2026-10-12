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
        public DbSet<Users> Users { get; set; }
        public DbSet<AdminLog> AdminLogs { get; set; }

    }
}