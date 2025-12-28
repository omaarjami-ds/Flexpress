import os
import shutil

# Path to the source logo
source_logo = r"c:\projet\projet delevery\static\logo.png"

# Base path for Android resources
res_base = r"c:\projet\projet delevery\frontend\android\app\src\main\res"

# Folders and file names to replace
folders = [
    "mipmap-mdpi",
    "mipmap-hdpi",
    "mipmap-xhdpi",
    "mipmap-xxhdpi",
    "mipmap-xxxhdpi"
]

files_to_replace = [
    "ic_launcher.png",
    "ic_launcher_round.png",
    "ic_launcher_foreground.png"
]

def update_icons():
    if not os.path.exists(source_logo):
        print(f"Error: Source logo not found at {source_logo}")
        return

    for folder in folders:
        target_dir = os.path.join(res_base, folder)
        if not os.path.exists(target_dir):
            print(f"Skipping {folder}: directory does not exist")
            continue
            
        for file_name in files_to_replace:
            target_path = os.path.join(target_dir, file_name)
            try:
                shutil.copy2(source_logo, target_path)
                print(f"Updated: {target_path}")
            except Exception as e:
                print(f"Error updating {target_path}: {e}")

if __name__ == "__main__":
    update_icons()
