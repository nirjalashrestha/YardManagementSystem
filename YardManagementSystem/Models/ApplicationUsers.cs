using Microsoft.AspNetCore.Identity;

namespace YardManagementSystem.Models
{
    public class ApplicationUsers : IdentityUser
    {
        public string PublicId { get; set; } = "";
        public string FullName { get; set; } = "";

        public string CountryCode { get; set; } = "+977";
        public string PhoneNumber2 { get; set; } = "";
        public string Address { get; set; } = "";

        public string AppRole { get; set; } = "View Only";
        public string Status { get; set; } = "Active";

        public string? LicenseNumber { get; set; }
        public string? PhotoUrl { get; set; }
        public string? ProfileImageUrl { get; set; }

        public string ThemePreference { get; set; } = "dark"; // light | dark
        public bool NotifyArrivals { get; set; } = true;
        public bool NotifyDepartures { get; set; } = true;
        public bool NotifyEmail { get; set; } = true;
        public bool NotifySms { get; set; } = false;

        public string? EmailOtp { get; set; }
        public DateTime? EmailOtpExpiry { get; set; }
        public bool IsEmailVerified { get; set; } = false;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
