document.addEventListener('DOMContentLoaded', function(){
    document.querySelectorAll('.container > .content > p').forEach(function(p, index) {
        p.animate([
            { opacity: 0, transform: 'translateY(-20px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            delay: index * 500,
            duration: 300,
            fill: 'both',
        });
    });

    let img = document.querySelector('.container > .content > img');

    img.addEventListener('click', function() { 

        let initialRotate = Math.floor(Math.random() * 70 - 35);
        img.animate([
            { opacity: 0, transform: `scale(1.5) rotate(${initialRotate}deg)` },
            { opacity: 1, transform: 'scale(1) rotate(0deg)' }
        ], {
            duration: 300,
            fill: 'both',
        });
    });
});