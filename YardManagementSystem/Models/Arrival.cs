using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Arrival
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(60)]
        public string ActivityId { get; set; } = "";

        [Required, MaxLength(10)]
        public string Date { get; set; } = "";

        [Required, MaxLength(5)]
        public string TimeIn { get; set; } = "";

        [Required, MaxLength(40)]
        public string GateNo { get; set; } = "Gate 1";

        [Required]
        public Guid FacilityId { get; set; }

        public Guid? LocationId { get; set; }

        public Guid? VehicleId { get; set; }

        public Guid? CarrierId { get; set; }

        public Guid? GoodsId { get; set; } // NEW

        [MaxLength(60)]
        public string? TrailerType { get; set; }

        [Required, MaxLength(60)]
        public string TrailerNumber { get; set; } = "";

        [MaxLength(450)]
        public string? DriverUserId { get; set; }

        [MaxLength(60)]
        public string? DriverId { get; set; }

        [MaxLength(160)]
        public string? DriverName { get; set; }

        [MaxLength(60)]
        public string Purpose { get; set; } = "Loading";

        [MaxLength(60)]
        public string Status { get; set; } = "Waiting";

        public bool DocumentVerified { get; set; } = true;
        public bool LicenseVerified { get; set; } = true;
        public bool SecurityCleared { get; set; } = true;

        [MaxLength(400)]
        public string? Remarks { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [ForeignKey(nameof(LocationId))]
        public Location? Location { get; set; }

        [ForeignKey(nameof(VehicleId))]
        public Vehicle? Vehicle { get; set; }

        [ForeignKey(nameof(CarrierId))]
        public Carrier? Carrier { get; set; }

        [ForeignKey(nameof(GoodsId))]
        public Goods? Goods { get; set; } // NEW
    }
}
