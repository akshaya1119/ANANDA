using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ANANDA_API.Migrations
{
    /// <inheritdoc />
    public partial class Admin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StudentId = table.Column<int>(type: "int", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PayuOrderId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PayuPaymentId = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Semester = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    REMARKS = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Students",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ENROLL_NO = table.Column<long>(type: "bigint", nullable: false),
                    ROLLNO = table.Column<long>(type: "bigint", nullable: false),
                    COURSE_ID = table.Column<int>(type: "int", nullable: false),
                    COURSE_NAME = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SEMESTER = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NAME = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FNAME = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MNAME = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    GENDER = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DOB = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CATEGORY = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    MOBILE = table.Column<long>(type: "bigint", nullable: false),
                    EMAIL_ID = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    COLLEGE_ID = table.Column<long>(type: "bigint", nullable: true),
                    COLLEGE_NAME = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PHOTO_URL = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SIGN_URL = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MAJOR_SUBJECT = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CGPA = table.Column<float>(type: "real", nullable: false),
                    FEE = table.Column<float>(type: "real", nullable: false),
                    Marksheet_Amount = table.Column<float>(type: "real", nullable: false),
                    Degree_Amount = table.Column<float>(type: "real", nullable: false),
                    PAYMENT_STATUS = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SESSION = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AADHAR = table.Column<long>(type: "bigint", nullable: false),
                    APAARID = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AADHARVALIDATION = table.Column<bool>(type: "bit", nullable: false),
                    REMARKS = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Students", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Password = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "Students");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
