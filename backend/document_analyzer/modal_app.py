import modal

app = modal.App("mashwara-document-analyzer")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("default-jre")
    .pip_install_from_requirements("requirements.txt")
    .add_local_dir(".", remote_path="/root/app")
)

@app.function(
    image=image,
    timeout=600,
    memory=4096,
    secrets=[modal.Secret.from_name("mashwara-secrets")]
)
@modal.asgi_app()
def fastapi_app():
    import os
    import sys

    sys.path.append("/root/app")

    os.chdir("/root/app")

    from main import app
    return app