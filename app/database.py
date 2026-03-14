from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Neon requires the endpoint ID when connecting by IP (SNI workaround)
if settings.NEON_ENDPOINT:
    @event.listens_for(engine.sync_engine, "do_connect")
    def set_neon_endpoint(dialect, conn_rec, cargs, cparams):
        cparams.setdefault("server_settings", {})
        cparams["server_settings"]["options"] = f"endpoint={settings.NEON_ENDPOINT}"

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
