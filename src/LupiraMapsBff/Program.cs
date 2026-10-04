using Lupira.Bff.Auth;
using Lupira.Bff.OpenApi;
using Lupira.Bff.Proxy;
using Lupira.Depz;
using Lupira.Depz.Yarp;
using Lupira.Hosting.Defaults;
using Lupira.Hosting.Health;
using Lupira.Hosting.Observability;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

if (builder.TryPrintLupiraBffRoutes(args)) return;

builder.AddLupiraDefaults(o =>
{
    o.StrictNumbers = false;
    o.CaseInsensitiveProperties = true;
    o.StatusCodePages = false;
});

builder.AddLupiraBffProxy();
builder.AddLupiraBffAuth(o =>
{
    o.EnableOidc = true;
    o.EnableBearer = true;
    o.Audience = "lupira-maps";
    o.CookieName = "__Host-lupira-maps";
    o.AdminGroups = ["cal-admins", "platform-admins"];
    o.DevGroups = ["cal-admins"];
});

builder.Services.AddLupiraHealth();

builder.Services.AddLupiraDepz(o =>
{
    builder.Configuration.GetSection(DepzOptions.SectionName).Bind(o);
    o.ServiceName = "lupira-maps-web";
    o.MeterName = "LupiraMapsBff.Depz";
    o.MetricPrefix = "mapsweb";
});
builder.Services.AddLupiraDepzYarpTargets(o =>
{
    o.ServiceNames["geo-api"] = "lupira-geo-api";
    o.ServiceNames["location-api"] = "lupira-location-api";
    o.ServiceNames["cal-api"] = "lupira-cal-api";
    o.ServiceNames["contact-api"] = "lupira-contact-api";
    o.ServiceNames["photo-api"] = "lupira-photo-api";
});

builder.Services.AddLupiraBffOpenApi(o =>
{
    o.Title = "LupiraMaps BFF";
    o.Version = "v1";
    o.RetagByCluster = true;
    o.NamespaceCollisions = true;
    o.Upstreams.Add(new UpstreamSpec { Cluster = "geo-api", Name = "LupiraGeoApi" });
    o.Upstreams.Add(new UpstreamSpec { Cluster = "location-api", Name = "LupiraLocationApi" });
    o.Upstreams.Add(new UpstreamSpec { Cluster = "cal-api", Name = "LupiraCalApi" });
    o.Upstreams.Add(new UpstreamSpec { Cluster = "contact-api", Name = "LupiraContactApi" });
    o.Upstreams.Add(new UpstreamSpec { Cluster = "photo-api", Name = "LupiraPhotoApi" });
    o.SecuritySchemes["Cookie"] = BffSecuritySchemes.Cookie("__Host-lupira-maps", "Session cookie minted by the BFF's OIDC login.");
    o.SecuritySchemes["Bearer"] = BffSecuritySchemes.Bearer("Authentik access token from a native client; audience must include lupira-maps.");
});

builder.AddLupiraTelemetry("lupira-maps-web");

var app = builder.Build();

app.UseLupiraDefaults();

if (app.Environment.IsProduction())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.MapLupiraHealth();

app.UseStaticFiles();

app.UseLupiraBffDeviceKeyGate();
app.UseAuthentication();
app.UseAuthorization();

app.MapLupiraAuthEndpoints();
app.MapDepz();

// Authenticated: the document is the whole internal API map, and the client reads the committed
// file rather than this endpoint.
app.MapOpenApi("/openapi/{documentName}.json").RequireAuthorization();
app.MapScalarApiReference("/scalar").RequireAuthorization();

app.MapLupiraBffProxy();

// SPA shell — served anonymously; the SPA's RequireAuth guard and the proxy route's policy enforce auth.
app.MapFallbackToFile("index.html");

app.Run();

// Exposes the implicit Program entry point to the integration test assembly (WebApplicationFactory<Program>).
public partial class Program;
