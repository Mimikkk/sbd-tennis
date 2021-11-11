using Microsoft.AspNetCore.Builder;

namespace Backend.Applications;

public static partial class Application
{
  static Application()
  {
    Layout = Build();
    RegisterEndpoints();
    RegisterUses();
  }

  internal static readonly WebApplication Layout = null!;
}
