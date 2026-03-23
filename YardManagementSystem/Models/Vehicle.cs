using System;
using System.ComponentModel.DataAnnotations;

namespace YardManagementSystem.Models
{
    public class Vehicle
    {
        [Key]
        public Guid Id { get; set; }

        public Guid? FacilityId { get; set; }

        [Required, MaxLength(50)]
        public string TrailerNumber { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? VehicleNumber { get; set; }

        [Required, MaxLength(100)]
        public string VehicleType { get; set; } = string.Empty;

        [Required, MaxLength(10)]
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, INACTIVE

        [MaxLength(100)]
        public string? DriverRefId { get; set; }

        [MaxLength(200)]
        public string? CarrierName { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        public string? PhotoUrl { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Facility? Facility { get; set; }
    }
}