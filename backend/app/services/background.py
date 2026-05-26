import asyncio

LLM_SEMAPHORE = asyncio.Semaphore(5)
_BACKGROUND_TASKS: set[asyncio.Task] = set()


def spawn_background(coro) -> None:
    task = asyncio.create_task(coro)
    _BACKGROUND_TASKS.add(task)
    task.add_done_callback(_BACKGROUND_TASKS.discard)
