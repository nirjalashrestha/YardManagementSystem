using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.DTOs
{
    public class ProfileMeDto
    {
        public string Id { get; set; } = "";
        public string PublicId { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Role { get; set; } = "";
        public string? PhoneNumber { get; set; }
        public string? Address { get; set; }
        public string? ProfileImageUrl { get; set; }
        public string ThemePreference { get; set; } = "dark";
        public bool NotifyArrivals { get; set; }
        public bool NotifyDepartures { get; set; }
        public bool NotifyEmail { get; set; }
        public bool NotifySms { get; set; }
    }

    public class UpdateProfileDto
    {
        [Required, MaxLength(120)]
        public string FullName { get; set; } = "";

        [Required, EmailAddress]
        public string Email { get; set; } = "";

        public string? PhoneNumber { get; set; }

        [MaxLength(200)]
        public string? Address { get; set; }
    }

    public class UpdatePreferencesDto
    {
        [MaxLength(10)]
        public string ThemePreference { get; set; } = "dark";
        public bool NotifyArrivals { get; set; }
        public bool NotifyDepartures { get; set; }
        public bool NotifyEmail { get; set; }
        public bool NotifySms { get; set; }
    }

    public class ChangePasswordSelfDto
    {
        [Required, MinLength(8)]
        public string NewPassword { get; set; } = "";

        [Required, MinLength(8)]
        public string ConfirmPassword { get; set; } = "";
    }

    public class AiSupportRequestDto
    {
        [Required, MaxLength(1000)]
        public string Message { get; set; } = "";
    }

    public class AiSupportResponseDto
    {
        public string Response { get; set; } = "";
    }
}
