import logging
import sys

from app.config import settings

_LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


class LoggerConfig:
    _instance: "LoggerConfig | None" = None

    def __init__(self) -> None:
        level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(_LOG_FORMAT, _DATE_FORMAT))

        root = logging.getLogger("app")
        root.setLevel(level)
        root.handlers = [handler]
        root.propagate = False

        self.logger = root

    @classmethod
    def get_instance(cls) -> "LoggerConfig":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def get_logger(self, name: str) -> logging.Logger:
        if name.startswith("app"):
            return logging.getLogger(name)
        return logging.getLogger(f"app.{name}")


def get_logger(name: str) -> logging.Logger:
    return LoggerConfig.get_instance().get_logger(name)


logger = LoggerConfig.get_instance().logger
