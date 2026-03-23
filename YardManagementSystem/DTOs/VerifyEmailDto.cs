using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.DTOs
{
    public class VerifyEmailDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = "";
    }
}