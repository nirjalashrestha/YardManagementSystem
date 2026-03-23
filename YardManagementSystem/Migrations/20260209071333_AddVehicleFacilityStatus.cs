using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleFacilityStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments");

            migrationBuilder.AddColumn<Guid>(
                name: "FacilityId",
                table: "Vehicles",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Vehicles",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "CarrierId",
                table: "Arrivals",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "TrailerTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FacilityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TrailerTypeName = table.Column<string>(type: "nvarchar(240)", maxLength: 240, nullable: false),
                    TrailerTypeCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Length = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrailerTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TrailerTypes_Facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vehicles_FacilityId",
                table: "Vehicles",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments",
                column: "ArrivalId",
                unique: true,
                filter: "DockOutAt IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments",
                column: "DockId",
                unique: true,
                filter: "DockOutAt IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Arrivals_CarrierId",
                table: "Arrivals",
                column: "CarrierId");

            migrationBuilder.CreateIndex(
                name: "IX_TrailerTypes_FacilityId_TrailerTypeCode",
                table: "TrailerTypes",
                columns: new[] { "FacilityId", "TrailerTypeCode" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Arrivals_Carriers_CarrierId",
                table: "Arrivals",
                column: "CarrierId",
                principalTable: "Carriers",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_Facilities_FacilityId",
                table: "Vehicles",
                column: "FacilityId",
                principalTable: "Facilities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Arrivals_Carriers_CarrierId",
                table: "Arrivals");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_Facilities_FacilityId",
                table: "Vehicles");

            migrationBuilder.DropTable(
                name: "TrailerTypes");

            migrationBuilder.DropIndex(
                name: "IX_Vehicles_FacilityId",
                table: "Vehicles");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments");

            migrationBuilder.DropIndex(
                name: "IX_Arrivals_CarrierId",
                table: "Arrivals");

            migrationBuilder.DropColumn(
                name: "FacilityId",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Vehicles");

            migrationBuilder.DropColumn(
                name: "CarrierId",
                table: "Arrivals");

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments",
                column: "ArrivalId",
                unique: true,
                filter: "[DockOutAt] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments",
                column: "DockId",
                unique: true,
                filter: "[DockOutAt] IS NULL");
        }
    }
}
