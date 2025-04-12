document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.getElementById('gallery');
    const fileInput = document.getElementById('file-input');
    const modal = document.getElementById('modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const closeBtn = document.getElementById('close-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const uploadBtn = document.querySelector('.upload-btn');
    const cameraUpload = document.getElementById('camera-upload');
    const folderUpload = document.getElementById('folder-upload');
    const urlUpload = document.getElementById('url-upload');
    
    let images = [];
    let currentImageIndex = 0;
    let draggedItem = null;
    let dropZone = null;
    let insertPosition = null;
    let clickCount = 0;
    let clickTimer = null;
    const originalBtnHTML = uploadBtn.innerHTML;

    // Initialize
    loadImages();

    // Event Listeners
    fileInput.addEventListener('change', handleFileUpload);
    closeBtn.addEventListener('click', closeModal);
    prevBtn.addEventListener('click', showPrevImage);
    nextBtn.addEventListener('click', showNextImage);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', handleKeyDown);

    // Upload icon event listeners
    cameraUpload.addEventListener('click', () => {
        alert('Camera upload functionality would go here');
    });
    
    folderUpload.addEventListener('click', () => {
        fileInput.webkitdirectory = true;
        fileInput.click();
        fileInput.webkitdirectory = false; // Reset after click
    });
    
    urlUpload.addEventListener('click', () => {
        const url = prompt('Enter image URL:');
        if (url) {
            uploadFromURL(url);
        }
    });

    // Add drag and drop events for the entire document
    document.addEventListener('dragover', handleDocumentDragOver);
    document.addEventListener('dragleave', handleDocumentDragLeave);
    document.addEventListener('drop', handleDocumentDrop);

    // Add drag and drop events for the gallery
    gallery.addEventListener('dragover', handleGalleryDragOver);
    gallery.addEventListener('dragleave', handleGalleryDragLeave);
    gallery.addEventListener('drop', handleGalleryDrop);

    function loadImages() {
        const savedImages = localStorage.getItem('galleryImages');
        if (savedImages) {
            try {
                images = JSON.parse(savedImages);
                renderGallery();
            } catch (e) {
                localStorage.removeItem('galleryImages');
            }
        }
    }

    function saveImages() {
        localStorage.setItem('galleryImages', JSON.stringify(images));
    }

    function handleFileUpload(e) {
        const files = Array.from(e.target.files).filter(file => 
            file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
        );

        if (files.length === 0) {
            alert('Please select valid image files (JPEG, PNG, etc.) under 10MB');
            return;
        }

        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;

        let loadedCount = 0;
        
        files.forEach(file => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                const newImage = {
                    id: Date.now() + Math.random().toString(36).slice(2, 11),
                    src: event.target.result,
                    name: file.name.replace(/\.[^/.]+$/, ""),
                    size: formatFileSize(file.size),
                    caption: file.name.replace(/\.[^/.]+$/, "")
                };

                // Insert at specific position if one was selected
                if (insertPosition !== null) {
                    images.splice(insertPosition, 0, newImage);
                    insertPosition = null; // Reset after insertion
                } else {
                    images.push(newImage);
                }
                
                loadedCount++;
                
                if (loadedCount === files.length) {
                    saveImages();
                    renderGallery();
                    uploadBtn.innerHTML = `<i class="fas fa-check"></i> Uploaded ${files.length} image(s)!`;
                    setTimeout(() => {
                        uploadBtn.innerHTML = originalBtnHTML;
                        uploadBtn.disabled = false;
                        fileInput.value = ''; // Reset file input
                    }, 2000);
                }
            };
            
            reader.onerror = () => {
                console.error('Error reading file:', file.name);
                loadedCount++;
                if (loadedCount === files.length) {
                    uploadBtn.innerHTML = originalBtnHTML;
                    uploadBtn.disabled = false;
                    fileInput.value = ''; // Reset file input
                }
            };
            
            reader.readAsDataURL(file);
        });
    }

    function uploadFromURL(url) {
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;
        
        // Create a temporary image to check if the URL is valid
        const img = new Image();
        img.onload = function() {
            const newImage = {
                id: Date.now() + Math.random().toString(36).slice(2, 11),
                src: url,
                name: 'Image from URL',
                size: 'Unknown',
                caption: 'Image from URL'
            };
            
            images.push(newImage);
            saveImages();
            renderGallery();
            uploadBtn.innerHTML = originalBtnHTML;
            uploadBtn.disabled = false;
        };
        
        img.onerror = function() {
            alert('Could not load image from this URL');
            uploadBtn.innerHTML = originalBtnHTML;
            uploadBtn.disabled = false;
        };
        
        img.src = url;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' Bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function renderGallery() {
        if (images.length === 0) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <p>Your gallery is empty. Upload some images to get started!</p>
                </div>
            `;
            return;
        }

        gallery.innerHTML = '';
        
        images.forEach((image, index) => {
            const galleryItem = document.createElement('div');
            galleryItem.className = 'gallery-item';
            galleryItem.draggable = true;
            galleryItem.dataset.id = image.id;
            
            galleryItem.innerHTML = `
                <div class="gallery-img-container">
                    <img src="${image.src}" alt="${image.name}" class="gallery-img">
                    <div class="caption">${image.caption || image.name}</div>
                    <button class="delete-btn" data-id="${image.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                    <button class="insert-btn" data-position="${index}">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            `;

            const captionElement = galleryItem.querySelector('.caption');
            
            // Make caption editable
            captionElement.addEventListener('click', (e) => {
                e.stopPropagation();
                makeCaptionEditable(captionElement, image);
            });

            // Drag events
            galleryItem.addEventListener('dragstart', handleDragStart);
            galleryItem.addEventListener('dragend', handleDragEnd);
            galleryItem.addEventListener('dragover', handleItemDragOver);
            galleryItem.addEventListener('dragenter', handleItemDragEnter);
            galleryItem.addEventListener('dragleave', handleItemDragLeave);
            galleryItem.addEventListener('drop', handleItemDrop);

            // Click to view in modal
            galleryItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-btn') && 
                    !e.target.classList.contains('caption') &&
                    !e.target.classList.contains('insert-btn') &&
                    !e.target.closest('.insert-btn')) {
                    
                    // Handle double click
                    clickCount++;
                    if (clickCount === 1) {
                        clickTimer = setTimeout(() => {
                            clickCount = 0;
                            currentImageIndex = index;
                            openModal();
                        }, 300);
                    } else if (clickCount === 2) {
                        clearTimeout(clickTimer);
                        clickCount = 0;
                        // Double click action (none currently)
                    }
                }
            });

            // Delete button
            galleryItem.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${image.caption || image.name}"?`)) {
                    images = images.filter(img => img.id !== image.id);
                    saveImages();
                    renderGallery();
                    
                    if (modal.classList.contains('active')) {
                        closeModal();
                    }
                }
            });

            // Insert button
            galleryItem.querySelector('.insert-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                insertPosition = parseInt(e.target.closest('.insert-btn').dataset.position) + 1;
                fileInput.click();
            });

            gallery.appendChild(galleryItem);
        });
    }

    function makeCaptionEditable(element, image) {
        element.contentEditable = true;
        element.classList.add('editable');
        element.focus();
        
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        function saveCaption() {
            element.contentEditable = false;
            element.classList.remove('editable');
            image.caption = element.textContent;
            saveImages();
            
            // Update modal caption if this image is currently displayed
            if (modal.classList.contains('active') && 
                images[currentImageIndex].id === image.id) {
                modalCaption.textContent = image.caption;
            }
            
            element.removeEventListener('blur', saveCaption);
            document.removeEventListener('keydown', handleCaptionKeyDown);
        }
        
        function handleCaptionKeyDown(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveCaption();
            }
        }
        
        element.addEventListener('blur', saveCaption);
        document.addEventListener('keydown', handleCaptionKeyDown);
    }

    // Document-wide drag and drop for file upload
    function handleDocumentDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only create drop zone if we're dragging files (not gallery items)
        if (e.dataTransfer.types.includes('Files')) {
            // Create drop zone if it doesn't exist
            if (!dropZone) {
                dropZone = document.createElement('div');
                dropZone.className = 'drop-zone';
                document.body.appendChild(dropZone);
            }
            
            dropZone.classList.add('active');
        }
    }

    function handleDocumentDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('active');
        }
    }

    function handleDocumentDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (dropZone) {
            dropZone.classList.remove('active');
            dropZone.remove();
            dropZone = null;
        }
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    }

    // Gallery-specific drag and drop for file upload
    function handleGalleryDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Only create drop zone if we're dragging files (not gallery items)
        if (e.dataTransfer.types.includes('Files')) {
            // Create drop zone if it doesn't exist
            if (!dropZone) {
                dropZone = document.createElement('div');
                dropZone.className = 'drop-zone';
                gallery.appendChild(dropZone);
            }
            
            dropZone.classList.add('active');
        }
    }

    function handleGalleryDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('active');
        }
    }

    function handleGalleryDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (dropZone) {
            dropZone.classList.remove('active');
            dropZone.remove();
            dropZone = null;
        }
        
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            const event = new Event('change');
            fileInput.dispatchEvent(event);
        }
    }

    // Item drag and drop for reordering
    function handleDragStart(e) {
        draggedItem = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    function handleItemDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleItemDragEnter(e) {
        e.preventDefault();
        if (this !== draggedItem) {
            this.classList.add('drag-over');
        }
    }

    function handleItemDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleItemDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        this.classList.remove('drag-over');
        
        if (draggedItem !== this) {
            // Swap DOM elements
            const galleryItems = Array.from(gallery.querySelectorAll('.gallery-item'));
            const fromIndex = galleryItems.indexOf(draggedItem);
            const toIndex = galleryItems.indexOf(this);
            
            if (fromIndex < toIndex) {
                gallery.insertBefore(draggedItem, this.nextSibling);
            } else {
                gallery.insertBefore(draggedItem, this);
            }
            
            // Update the images array order
            const movedItem = images.splice(fromIndex, 1)[0];
            images.splice(toIndex, 0, movedItem);
            saveImages();
        }
    }

    function openModal() {
        if (images.length === 0) return;
        
        modal.classList.add('active');
        updateModalImage();
        document.body.style.overflow = 'hidden';
    }

    function updateModalImage() {
        const img = images[currentImageIndex];
        modalImg.src = img.src;
        modalCaption.textContent = img.caption || img.name;
    }

    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showNextImage() {
        if (images.length === 0) return;
        currentImageIndex = (currentImageIndex + 1) % images.length;
        updateModalImage();
    }

    function showPrevImage() {
        if (images.length === 0) return;
        currentImageIndex = (currentImageIndex - 1 + images.length) % images.length;
        updateModalImage();
    }

    function handleKeyDown(e) {
        if (!modal.classList.contains('active')) return;
        
        switch (e.key) {
            case 'Escape':
                closeModal();
                break;
            case 'ArrowRight':
                showNextImage();
                break;
            case 'ArrowLeft':
                showPrevImage();
                break;
        }
    }
});