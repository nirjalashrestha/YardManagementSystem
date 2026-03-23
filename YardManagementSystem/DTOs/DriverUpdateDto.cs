namespace YardManagementSystem.Dtos
{
    public class DriverUpdateDto
    {
        public string FullName { get; set; } = "";
        public string LicenseNumber { get; set; } = "";
        public string CountryCode { get; set; } = "+977";
        public string PhoneNumber { get; set; } = "";
        public string? Email { get; set; }
        public string Address { get; set; } = "";
        public string Status { get; set; } = "Active";
        public string? PhotoUrl { get; set; }

        public string? Password { get; set; } // ✅ optional
    }
}