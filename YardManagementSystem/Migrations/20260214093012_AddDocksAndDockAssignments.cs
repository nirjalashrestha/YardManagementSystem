using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddDocksAndDockAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Docks_Locations_LocationId",
                table: "Docks");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Docks",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Docks",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "DockAssignments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReleasedAt",
                table: "DockAssignments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReleasedBy",
                table: "DockAssignments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "DockAssignments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments",
                column: "ArrivalId",
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_ArrivalId_DockInAt",
                table: "DockAssignments",
                columns: new[] { "ArrivalId", "DockInAt" });

            migrationBuilder.CreateIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments",
                column: "DockId",
                unique: true,
                filter: "[IsActive] = 1");

            migrationBuilder.AddForeignKey(
                name: "FK_Docks_Locations_LocationId",
                table: "Docks",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Docks_Locations_LocationId",
                table: "Docks");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_ArrivalId",
                table: "DockAssignments");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_ArrivalId_DockInAt",
                table: "DockAssignments");

            migrationBuilder.DropIndex(
                name: "IX_DockAssignments_DockId",
                table: "DockAssignments");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Docks");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Docks");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "DockAssignments");

            migrationBuilder.DropColumn(
                name: "ReleasedAt",
                table: "DockAssignments");

            migrationBuilder.DropColumn(
                name: "ReleasedBy",
                table: "DockAssignments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "DockAssignments");

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

            migrationBuilder.AddForeignKey(
                name: "FK_Docks_Locations_LocationId",
                table: "Docks",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
