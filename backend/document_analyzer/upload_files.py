import modal

app = modal.App()

volume = modal.Volume.from_name(
    "document-analyzer-data",
    create_if_missing=True
)

@app.function(volumes={"/root/app": volume})
def upload():
    pass