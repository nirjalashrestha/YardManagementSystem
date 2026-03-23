using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class InitGateActivity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Arrivals",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActivityId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Date = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    TimeIn = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    GateNo = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FacilityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TrailerType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    TrailerNumber = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    DriverUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    DriverId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    DriverName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    DocumentVerified = table.Column<bool>(type: "bit", nullable: false),
                    LicenseVerified = table.Column<bool>(type: "bit", nullable: false),
                    SecurityCleared = table.Column<bool>(type: "bit", nullable: false),
                    Remarks = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Arrivals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Arrivals_Facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Arrivals_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Arrivals_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Departures",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ActivityId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    RefArrivalActivityId = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: true),
                    Date = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    TimeOut = table.Column<string>(type: "nvarchar(5)", maxLength: 5, nullable: false),
                    ExitGateNo = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    FacilityId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LocationId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CarrierName = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: false),
                    TrailerNumber = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    LoadingStatus = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    FinalStatus = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    DelayReason = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DamageNotes = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SecurityRemarks = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Departures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Departures_Facilities_FacilityId",
                        column: x => x.FacilityId,
                        principalTable: "Facilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Departures_Locations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "Locations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Departures_Vehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "Vehicles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Arrivals_ActivityId",
                table: "Arrivals",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Arrivals_FacilityId",
                table: "Arrivals",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_Arrivals_LocationId",
                table: "Arrivals",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Arrivals_VehicleId",
                table: "Arrivals",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_Departures_ActivityId",
                table: "Departures",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Departures_FacilityId",
                table: "Departures",
                column: "FacilityId");

            migrationBuilder.CreateIndex(
                name: "IX_Departures_LocationId",
                table: "Departures",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_Departures_VehicleId",
                table: "Departures",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Arrivals");

            migrationBuilder.DropTable(
                name: "Departures");
        }
    }
}
