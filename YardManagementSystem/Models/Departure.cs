using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YardManagementSystem.Models
{
    public class Departure
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required, MaxLength(60)]
        public string ActivityId { get; set; } = "";

        [MaxLength(60)]
        public string? RefArrivalActivityId { get; set; }

        [MaxLength(60)]
        public string? RefYardMoveId { get; set; }

        [Required, MaxLength(10)]
        public string Date { get; set; } = "";

        [Required, MaxLength(5)]
        public string TimeOut { get; set; } = "";

        [Required, MaxLength(40)]
        public string ExitGateNo { get; set; } = "Gate 1";

       
        [Required]
        public Guid FacilityId { get; set; }

      
        public Guid? LocationId { get; set; }

        [MaxLength(120)]
        public string? CarrierName { get; set; }

        [Required, MaxLength(60)]
        public string TrailerNumber { get; set; } = "";

        [MaxLength(60)]
        public string? TrailerType { get; set; }

        public Guid? GoodsId { get; set; }

        [ForeignKey(nameof(GoodsId))]
        public Goods? Goods { get; set; }


        [MaxLength(120)]
        public string? DriverName { get; set; }

        [MaxLength(60)]
        public string LoadingStatus { get; set; } = "Completed";

        [MaxLength(60)]
        public string FinalStatus { get; set; } = "Exited";

        [MaxLength(250)]
        public string? DelayReason { get; set; }

        [MaxLength(250)]
        public string? DamageNotes { get; set; }

        [MaxLength(400)]
        public string? SecurityRemarks { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        
        [ForeignKey(nameof(FacilityId))]
        public Facility? Facility { get; set; }

        [ForeignKey(nameof(LocationId))]
        public Location? Location { get; set; }
    }
}
