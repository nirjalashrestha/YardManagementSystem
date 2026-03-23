using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddRegisterFirstLastPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ParkingAssignments_ArrivalId",
                table: "ParkingAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ParkingAssignments_ParkingSlotId",
                table: "ParkingAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingAssignments_ArrivalId",
                table: "ParkingAssignments",
                column: "ArrivalId",
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingAssignments_ParkingSlotId",
                table: "ParkingAssignments",
                column: "ParkingSlotId",
                unique: true,
                filter: "[IsActive] = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ParkingAssignments_ArrivalId",
                table: "ParkingAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ParkingAssignments_ParkingSlotId",
                table: "ParkingAssignments");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingAssignments_ArrivalId",
                table: "ParkingAssignments",
                column: "ArrivalId",
                unique: true,
                filter: "IsActive = 1");

            migrationBuilder.CreateIndex(
                name: "IX_ParkingAssignments_ParkingSlotId",
                table: "ParkingAssignments",
                column: "ParkingSlotId",
                unique: true,
                filter: "IsActive = 1");
        }
    }
}
