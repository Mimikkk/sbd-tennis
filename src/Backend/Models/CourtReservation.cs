﻿using System;
using Backend.Models.Base;

namespace Backend.Models;

public record CourtReservation(Guid courtId, DateTime start, DateTime end, string? note) : Reservation(start, end);