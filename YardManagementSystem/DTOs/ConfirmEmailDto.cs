using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.DTOs
{
    public class ConfirmEmailDto
    {
        [Required, EmailAddress]
        public string Email { get; set; } = "";

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = "";
    }
}