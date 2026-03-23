using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using YardManagementSystem.Models;

namespace YardManagementSystem.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUsers>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options) { }

        // Tables
        public DbSet<Facility> Facilities { get; set; } = default!;
        public DbSet<Carrier> Carriers { get; set; } = default!;
        public DbSet<TrailerType> TrailerTypes { get; set; } = default!;
        public DbSet<Location> Locations { get; set; } = default!;
        public DbSet<Vehicle> Vehicles { get; set; } = default!;
        public DbSet<YardMove> YardMoves { get; set; } = default!;
        public DbSet<Arrival> Arrivals { get; set; } = default!;
        public DbSet<Departure> Departures { get; set; } = default!;
        public DbSet<YardCheck> YardChecks { get; set; } = default!;
        public DbSet<Inspection> Inspections { get; set; } = default!;
        public DbSet<Gate> Gates { get; set; } = default!;
        public DbSet<Dock> Docks { get; set; } = default!;
        public DbSet<DockAssignment> DockAssignments { get; set; } = default!;
        public DbSet<Goods> Goods { get; set; } = default!;
        public DbSet<ParkingSlot> ParkingSlots { get; set; } = default!;
        public DbSet<ParkingAssignment> ParkingAssignments { get; set; } = default!;
        public DbSet<UserNotification> UserNotifications { get; set; } = default!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Vehicle>()
                .HasIndex(v => v.TrailerNumber)
                .IsUnique();

            builder.Entity<Facility>()
                .HasIndex(f => f.FacilityCode)
                .IsUnique();

            builder.Entity<Carrier>()
                .HasIndex(c => new { c.FacilityId, c.CarrierCode })
                .IsUnique();

            builder.Entity<Location>()
                .HasIndex(l => l.LocationCode)
                .IsUnique();

            builder.Entity<Vehicle>()
                .HasOne(v => v.Facility)
                .WithMany()
                .HasForeignKey(v => v.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<TrailerType>()
                .HasIndex(t => new { t.FacilityId, t.TrailerTypeCode })
                .IsUnique();

            builder.Entity<TrailerType>()
                .HasOne(t => t.Facility)
                .WithMany()
                .HasForeignKey(t => t.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Arrival>()
                .HasIndex(x => x.ActivityId)
                .IsUnique();

            builder.Entity<Departure>()
                .HasIndex(x => x.ActivityId)
                .IsUnique();

            // Carrier
            builder.Entity<Carrier>()
                .HasOne(c => c.Facility)
                .WithMany()
                .HasForeignKey(c => c.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            // Location
            builder.Entity<Location>()
                .HasOne(l => l.Facility)
                .WithMany()
                .HasForeignKey(l => l.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<YardMove>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<YardMove>()
                .HasOne(x => x.Carrier)
                .WithMany()
                .HasForeignKey(x => x.CarrierId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<YardMove>()
                .HasOne(x => x.FromLocation)
                .WithMany()
                .HasForeignKey(x => x.FromLocationId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<YardMove>()
                .HasOne(x => x.ToLocation)
                .WithMany()
                .HasForeignKey(x => x.ToLocationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<YardMove>()
                .HasIndex(x => new { x.FacilityId, x.MoveDateTime });

            builder.Entity<YardMove>()
                .HasIndex(x => x.TrailerNumber);

            // YardCheck
            builder.Entity<YardCheck>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<YardCheck>()
                .HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<YardCheck>()
                .HasIndex(x => new { x.FacilityId, x.Date, x.Time });

            builder.Entity<YardCheck>()
                .HasIndex(x => x.TrailerNumber);

            builder.Entity<YardCheck>()
                .HasIndex(x => x.Status);

            builder.Entity<Inspection>()
                .HasOne(x => x.Carrier)
                .WithMany()
                .HasForeignKey(x => x.CarrierId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Inspection>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Inspection>()
                .HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Arrival>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Arrival>()
                .HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Arrival>()
                .HasOne(x => x.Vehicle)
                .WithMany()
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.Entity<Departure>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Departure>()
                .HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.SetNull);

            // Gate
            builder.Entity<Gate>()
                .HasIndex(g => new { g.FacilityId, g.GateName })
                .IsUnique();

            builder.Entity<Gate>()
                .HasOne(g => g.Facility)
                .WithMany()
                .HasForeignKey(g => g.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            // Dock
            builder.Entity<Dock>()
                .HasIndex(d => new { d.FacilityId, d.LocationId, d.DockName })
                .IsUnique();

            builder.Entity<Dock>()
                .HasOne(d => d.Facility)
                .WithMany()
                .HasForeignKey(d => d.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Dock>()
                .HasOne(d => d.Location)
                .WithMany()
                .HasForeignKey(d => d.LocationId)
                .OnDelete(DeleteBehavior.SetNull); // location is optional in DTO/model

            // DockAssignment: one active assignment per Dock and per Arrival
            builder.Entity<DockAssignment>()
                .HasIndex(x => x.DockId)
                .IsUnique()
                .HasFilter("[IsActive] = 1"); // SQL Server syntax

            builder.Entity<DockAssignment>()
                .HasIndex(x => x.ArrivalId)
                .IsUnique()
                .HasFilter("[IsActive] = 1"); // SQL Server syntax

            builder.Entity<DockAssignment>()
                .HasIndex(x => new { x.ArrivalId, x.DockInAt });

            builder.Entity<DockAssignment>()
                .HasOne(x => x.Dock)
                .WithMany(d => d.DockAssignments)
                .HasForeignKey(x => x.DockId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<DockAssignment>()
                .HasOne(x => x.Arrival)
                .WithMany()
                .HasForeignKey(x => x.ArrivalId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<Goods>()
                .HasIndex(x => new { x.FacilityId, x.GoodsCode })
                .IsUnique();

            builder.Entity<Goods>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ParkingSlot>()
                .HasIndex(x => new { x.FacilityId, x.LocationId, x.SlotCode })
                .IsUnique();

            builder.Entity<ParkingSlot>()
                .HasOne(x => x.Facility)
                .WithMany()
                .HasForeignKey(x => x.FacilityId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ParkingSlot>()
                .HasOne(x => x.Location)
                .WithMany()
                .HasForeignKey(x => x.LocationId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ParkingAssignment>()
                .HasIndex(x => x.ParkingSlotId)
                .IsUnique()
                .HasFilter("[IsActive] = 1");

            builder.Entity<ParkingAssignment>()
                .HasIndex(x => x.ArrivalId)
                .IsUnique()
                .HasFilter("[IsActive] = 1");

            builder.Entity<ParkingAssignment>()
                .HasOne(x => x.ParkingSlot)
                .WithMany()
                .HasForeignKey(x => x.ParkingSlotId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<ParkingAssignment>()
                .HasOne(x => x.Arrival)
                .WithMany()
                .HasForeignKey(x => x.ArrivalId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<UserNotification>()
                .HasIndex(x => new { x.UserId, x.CreatedAtUtc });

            builder.Entity<UserNotification>()
                .HasIndex(x => new { x.UserId, x.IsRead });
        }
    }
}
