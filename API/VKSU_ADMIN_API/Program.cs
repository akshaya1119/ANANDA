using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Builder;
using VKSU_ADMIN_API.Data;
using VKSU_ADMIN_API.Models;
//using VKSU_ADMIN_API.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("RemoteSqlServer")));


using (var scope = builder.Services.BuildServiceProvider().CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    Console.WriteLine(db.Database.GetConnectionString());
   
}

// Add services
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null;
    });
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();
//builder.Services.AddScoped<ISmsService, SmsService>();
//builder.Services.AddScoped<IAuditLogService, AuditLogService>();
//builder.Services.AddScoped<IErrorLogService, ErrorLogService>();
//builder.Services.AddHostedService<PaymentReconciliationService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ✅ Add CORS (important for React frontend)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// ✅ Add Authentication (JWT)
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        var jwtSettings = builder.Configuration.GetSection("JwtSettings");
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]))
        };
    });

// ✅ Authorization
builder.Services.AddAuthorization();

builder.Services.AddControllersWithViews();
// If using Razor Pages / PDF
builder.Services.AddRazorPages();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

// Middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

//app.UseMiddleware<VKSU_ADMIN_API.Middlewares.ExceptionHandlingMiddleware>();

// ✅ Enable CORS FIRST before HttpsRedirection (crucial for preflight OPTIONS requests)

//app.UseHttpsRedirection();
app.UseCors("AllowAll");

// Only redirect to HTTPS in production
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// ✅ Enable Authentication BEFORE Authorization
app.UseAuthentication();
app.UseAuthorization();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
});
app.MapControllers();
app.MapRazorPages();

app.Run();