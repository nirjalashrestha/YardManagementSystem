using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YardManagementSystem.Migrations
{
    /// <inheritdoc />
    public partial class AddYardMoveFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_YardMoves_Carriers_CarrierId",
                table: "YardMoves");

            migrationBuilder.DropForeignKey(
                name: "FK_YardMoves_Locations_LocationId",
                table: "YardMoves");

            migrationBuilder.DropIndex(
                name: "IX_YardMoves_FacilityId",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "Date",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "Time",
                table: "YardMoves");

            migrationBuilder.RenameColumn(
                name: "LocationId",
                table: "YardMoves",
                newName: "VehicleId");

            migrationBuilder.RenameIndex(
                name: "IX_YardMoves_LocationId",
                table: "YardMoves",
                newName: "IX_YardMoves_VehicleId");

            migrationBuilder.AlterColumn<string>(
                name: "TrailerNumber",
                table: "YardMoves",
                type: "nvarchar(60)",
                maxLength: 60,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "YardMoves",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "Remarks",
                table: "YardMoves",
                type: "nvarchar(400)",
                maxLength: 400,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "CarrierId",
                table: "YardMoves",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AlterColumn<Guid>(
                name: "Id",
                table: "YardMoves",
                type: "uniqueidentifier",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int")
                .OldAnnotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "YardMoves",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "YardMoves",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "FromLocationId",
                table: "YardMoves",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "MoveDateTime",
                table: "YardMoves",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "ToLocationId",
                table: "YardMoves",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "YardMoves",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "YardMoves",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_YardMoves_FacilityId_MoveDateTime",
                table: "YardMoves",
                columns: new[] { "FacilityId", "MoveDateTime" });

            migrationBuilder.CreateIndex(
                name: "IX_YardMoves_FromLocationId",
                table: "YardMoves",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_YardMoves_ToLocationId",
                table: "YardMoves",
                column: "ToLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_YardMoves_TrailerNumber",
                table: "YardMoves",
                column: "TrailerNumber");

            migrationBuilder.AddForeignKey(
                name: "FK_YardMoves_Carriers_CarrierId",
                table: "YardMoves",
                column: "CarrierId",
                principalTable: "Carriers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_YardMoves_Locations_FromLocationId",
                table: "YardMoves",
                column: "FromLocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_YardMoves_Locations_ToLocationId",
                table: "YardMoves",
                column: "ToLocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_YardMoves_Vehicles_VehicleId",
                table: "YardMoves",
                column: "VehicleId",
                principalTable: "Vehicles",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_YardMoves_Carriers_CarrierId",
                table: "YardMoves");

            migrationBuilder.DropForeignKey(
                name: "FK_YardMoves_Locations_FromLocationId",
                table: "YardMoves");

            migrationBuilder.DropForeignKey(
                name: "FK_YardMoves_Locations_ToLocationId",
                table: "YardMoves");

            migrationBuilder.DropForeignKey(
                name: "FK_YardMoves_Vehicles_VehicleId",
                table: "YardMoves");

            migrationBuilder.DropIndex(
                name: "IX_YardMoves_FacilityId_MoveDateTime",
                table: "YardMoves");

            migrationBuilder.DropIndex(
                name: "IX_YardMoves_FromLocationId",
                table: "YardMoves");

            migrationBuilder.DropIndex(
                name: "IX_YardMoves_ToLocationId",
                table: "YardMoves");

            migrationBuilder.DropIndex(
                name: "IX_YardMoves_TrailerNumber",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "FromLocationId",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "MoveDateTime",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "ToLocationId",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "YardMoves");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "YardMoves");

            migrationBuilder.RenameColumn(
                name: "VehicleId",
                table: "YardMoves",
                newName: "LocationId");

            migrationBuilder.RenameIndex(
                name: "IX_YardMoves_VehicleId",
                table: "YardMoves",
                newName: "IX_YardMoves_LocationId");

            migrationBuilder.AlterColumn<string>(
                name: "TrailerNumber",
                table: "YardMoves",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(60)",
                oldMaxLength: 60);

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "YardMoves",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "Remarks",
                table: "YardMoves",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(400)",
                oldMaxLength: 400,
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "CarrierId",
                table: "YardMoves",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "Id",
                table: "YardMoves",
                type: "int",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier")
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddColumn<DateOnly>(
                name: "Date",
                table: "YardMoves",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1));

            migrationBuilder.AddColumn<TimeOnly>(
                name: "Time",
                table: "YardMoves",
                type: "time",
                nullable: false,
                defaultValue: new TimeOnly(0, 0, 0));

            migrationBuilder.CreateIndex(
                name: "IX_YardMoves_FacilityId",
                table: "YardMoves",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_YardMoves_Carriers_CarrierId",
                table: "YardMoves",
                column: "CarrierId",
                principalTable: "Carriers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_YardMoves_Locations_LocationId",
                table: "YardMoves",
                column: "LocationId",
                principalTable: "Locations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
