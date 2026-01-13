
import React, { useEffect, useRef } from 'react';

export const ParticlesBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        let mouseX = -1000;
        let mouseY = -1000;

        // Configuration
        const particleCount = 60; // Nombre de particules
        const mouseRadius = 200; // Rayon d'interaction souris
        const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#cbd5e1']; // Palette bleue

        class Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            originalX: number;
            originalY: number;

            constructor(width: number, height: number) {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.originalX = this.x;
                this.originalY = this.y;
                // Vitesse très lente pour effet "naturel"
                this.vx = (Math.random() - 0.5) * 0.5;
                this.vy = (Math.random() - 0.5) * 0.5;
                this.size = Math.random() * 3 + 1; // Taille variable
                this.color = colors[Math.floor(Math.random() * colors.length)];
            }

            update(width: number, height: number) {
                // Mouvement naturel de base
                this.x += this.vx;
                this.y += this.vy;

                // Rebond sur les bords
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;

                // Interaction Souris (Répulsion douce)
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < mouseRadius) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (mouseRadius - distance) / mouseRadius;
                    const directionX = forceDirectionX * force * 2; // Force de répulsion
                    const directionY = forceDirectionY * force * 2;

                    this.x -= directionX;
                    this.y -= directionY;
                } else {
                    // Retour progressif vers trajectoire normale si pas d'interaction
                    // (Optionnel, ici on laisse juste la physique courir)
                }
            }

            draw(context: CanvasRenderingContext2D) {
                context.beginPath();
                context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                context.fillStyle = this.color;
                context.globalAlpha = 0.6; // Légère transparence
                context.fill();
            }
        }

        const init = () => {
            // Set canvas size
            canvas.width = container.clientWidth;
            canvas.height = container.clientHeight;

            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(new Particle(canvas.width, canvas.height));
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Update and draw particles
            particles.forEach(particle => {
                particle.update(canvas.width, canvas.height);
                particle.draw(ctx);
            });

            // Draw connections properly
            // (Optionnel : désactivé pour l'instant pour coller à l'image "points" 
            // mais on peut l'activer si l'utilisateur veut un effet "réseau")
            // Je laisse désactivé pour l'instant pour faire "juste des points qui bougent" comme demandé.

            animationFrameId = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        };

        const handleMouseLeave = () => {
            mouseX = -1000;
            mouseY = -1000;
        }

        // Initialize
        init();
        animate();

        // Listeners
        window.addEventListener('resize', handleResize);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove);
                container.removeEventListener('mouseleave', handleMouseLeave);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                pointerEvents: 'auto' // Important pour capturer la souris
            }}
        >
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};
