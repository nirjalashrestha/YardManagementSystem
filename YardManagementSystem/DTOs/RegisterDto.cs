using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.DTOs
{
    public class RegisterDto
    {
        [Required(ErrorMessage = "FirstName is required.")]
        [MaxLength(80)]
        public string FirstName { get; set; } = "";

        [Required(ErrorMessage = "LastName is required.")]
        [MaxLength(80)]
        public string LastName { get; set; } = "";

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = "";

        [Required(ErrorMessage = "PhoneNumber is required.")]
        [Phone]
        [MaxLength(20)]
        public string PhoneNumber { get; set; } = "";

        [Required(ErrorMessage = "Password is required.")]
        [StringLength(40, MinimumLength = 8,
            ErrorMessage = "The {0} must be at least {2} and at max {1} characters.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = "";

        [Required(ErrorMessage = "Confirm Password is required.")]
        [DataType(DataType.Password)]
        [Compare("Password", ErrorMessage = "Password does not match.")]
        public string ConfirmPassword { get; set; } = "";
    }
}
