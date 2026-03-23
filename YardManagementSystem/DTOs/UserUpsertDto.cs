namespace YardManagementSystem.DTOs
{
    public class UserUpsertDto
    {
        public string UserId { get; set; } = "";        // you send DRV-... or USR-...
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string CountryCode { get; set; } = "+977";
        public string PhoneNumber { get; set; } = "";
        public string Address { get; set; } = "";

        public string Role { get; set; } = "View Only"; // Admin, Driver, Yard Manager, ...
        public string Status { get; set; } = "Active";

        public string? LicenseNumber { get; set; }      // only when Role=Driver
        public string? Password { get; set; }           // required on create, optional on edit
        public string? PhotoUrl { get; set; }
    }

    public class ToggleStatusDto
    {
        public string Status { get; set; } = "Active";  // or omit and just toggle in backend
    }
}