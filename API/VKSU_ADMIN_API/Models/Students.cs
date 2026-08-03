using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace VKSU_ADMIN_API.Models
{
    public class Students
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }
        public long ENROLL_NO { get; set; }
        public long ROLLNO { get; set; }
        public int COURSE_ID { get; set; }
        public string COURSE_NAME { get; set; }
        public string SEMESTER { get; set; }
        public string NAME { get; set; }
        public string FNAME { get; set; }
        public string MNAME { get; set; }
        public string GENDER { get; set; }
        public string DOB { get; set; }
        public string? CATEGORY { get; set; }
        public long MOBILE { get; set; }
        public string EMAIL_ID { get; set; }
        public long? COLLEGE_ID { get; set; }
        public string? COLLEGE_NAME { get; set; }
        public string PHOTO_URL { get; set; }
        public string SIGN_URL { get; set; }
        public string MAJOR_SUBJECT { get; set; }
        public float CGPA { get; set; }
        public float FEE { get; set; }
        public float Degree_Amount { get; set; }
        public float Marksheet_Amount { get; set; }
        public string? PAYMENT_STATUS { get; set; }
        public string SESSION { get; set; }
        public string? APAARID { get; set; }
        public long AADHAR { get; set; }
        public bool? AADHARVALIDATION { get; set; }
    }
}
