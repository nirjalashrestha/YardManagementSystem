using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.DTOs
{
    public class VehicleUpsertDto
    {
        [Required]
        public string FacilityId { get; set; } = string.Empty;

        // optional (display only)
        public string? VehicleNumber { get; set; }

        [Required]
        public string TrailerNumber { get; set; } = string.Empty;

        [Required]
        public string VehicleType { get; set; } = string.Empty;

        [Required]
        public string Status { get; set; } = "ACTIVE";

        public string? DriverRefId { get; set; }

        public string? CarrierName { get; set; }

        public string? Notes { get; set; }
    }
}