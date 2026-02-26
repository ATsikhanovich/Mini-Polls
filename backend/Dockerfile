# ── Build stage ───────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and project files first to leverage Docker layer caching
COPY MiniPolls.sln .
COPY src/MiniPolls.Domain/MiniPolls.Domain.csproj src/MiniPolls.Domain/
COPY src/MiniPolls.Application/MiniPolls.Application.csproj src/MiniPolls.Application/
COPY src/MiniPolls.Infrastructure/MiniPolls.Infrastructure.csproj src/MiniPolls.Infrastructure/
COPY src/MiniPolls.Api/MiniPolls.Api.csproj src/MiniPolls.Api/
COPY Directory.Build.props .

RUN dotnet restore src/MiniPolls.Api/MiniPolls.Api.csproj

# Copy remaining source files
COPY src/ src/

RUN dotnet publish src/MiniPolls.Api/MiniPolls.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create the data directory for the SQLite volume mount
RUN mkdir -p /app/data

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ConnectionStrings__Default="Data Source=/app/data/minipolls.db"

EXPOSE 8080

ENTRYPOINT ["dotnet", "MiniPolls.Api.dll"]
