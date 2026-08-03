using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ANANDA_API.Models
{
    public class Users
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public string UserId { get; set; }
        public string FullName { get; set; }
        public string UserName { get; set; }
       public string Password { get; set; }
        public bool Status { get; set; }


    }
}
