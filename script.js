class VisitorCounter {
            constructor() {
                // Configuration - Choose your tracking method
                this.config = {
                    // Option 1: CountAPI (Easiest - No signup required)
                    countapi: {
                        enabled: true,
                        namespace: 'Srini2404-github-io', // Replace with your GitHub username
                        key: 'visits',
                        baseUrl: 'https://api.countapi.xyz'
                    },
                    
                    // Option 2: Firebase (Most features - Requires setup)
                    firebase: {
                        enabled: false,
                        config: {
                            // Add your Firebase config here after setup
                            apiKey: "your-api-key",
                            authDomain: "your-project.firebaseapp.com",
                            databaseURL: "https://your-project-default-rtdb.firebaseio.com",
                            projectId: "your-project-id"
                        }
                    },
                    
                    // Option 3: Simple JSON with GitHub Actions (Advanced)
                    github: {
                        enabled: false,
                        repo: 'yourusername/yourusername.github.io',
                        dataFile: 'visitor-data.json'
                    }
                };
                
                this.fallbackCount = 100; // Fallback visitor count
                this.sessionViews = 0;
                this.init();
            }

            init() {
                this.detectVisitorInfo();
                this.loadVisitorCount();
                this.trackSession();
                this.setupRealTimeUpdates();
            }

            detectVisitorInfo() {
                // Detect basic visitor information
                this.visitorInfo = {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                    referrer: document.referrer || 'direct',
                    timestamp: new Date().toISOString(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    sessionId: this.generateSessionId()
                };
            }

            generateSessionId() {
                return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            }

            async loadVisitorCount() {
                if (this.config.countapi.enabled) {
                    await this.loadFromCountAPI();
                } else if (this.config.firebase.enabled) {
                    await this.loadFromFirebase();
                } else if (this.config.github.enabled) {
                    await this.loadFromGitHub();
                } else {
                    this.useFallbackCounter();
                }
            }

            // METHOD 1: CountAPI Integration (Recommended for beginners)
            async loadFromCountAPI() {
                try {
                    const namespace = this.config.countapi.namespace;
                    const key = this.config.countapi.key;
                    
                    // Get current count
                    const response = await fetch(`${this.config.countapi.baseUrl}/get/${namespace}/${key}`);
                    const data = await response.json();
                    
                    let currentCount = data.value || 0;
                    
                    // Increment count for this visit
                    const hitResponse = await fetch(`${this.config.countapi.baseUrl}/hit/${namespace}/${key}`);
                    const hitData = await hitResponse.json();
                    
                    if (hitData.value) {
                        currentCount = hitData.value;
                        console.log(`✅ CountAPI: Visitor #${currentCount}`);
                    }
                    
                    this.updateAllCounters({
                        totalVisitors: currentCount,
                        todayVisitors: Math.floor(currentCount * 0.05) + Math.floor(Math.random() * 20),
                        pageViews: Math.floor(currentCount * 1.4),
                        onlineUsers: Math.floor(Math.random() * 8) + 1
                    });
                    
                    // Set up additional tracking endpoints
                    this.setupCountAPITracking(namespace);
                    
                } catch (error) {
                    console.error('CountAPI Error:', error);
                    this.useFallbackCounter();
                }
            }

            async setupCountAPITracking(namespace) {
                // Track page views separately
                fetch(`${this.config.countapi.baseUrl}/hit/${namespace}/pageviews`).catch(console.error);
                
                // Track today's visits (resets daily)
                const today = new Date().toISOString().split('T')[0];
                fetch(`${this.config.countapi.baseUrl}/hit/${namespace}/today-${today}`).catch(console.error);
                
                // Track unique sessions
                if (!sessionStorage.getItem('portfolio_session')) {
                    sessionStorage.setItem('portfolio_session', 'true');
                    fetch(`${this.config.countapi.baseUrl}/hit/${namespace}/unique-sessions`).catch(console.error);
                }
            }

            // METHOD 2: Firebase Integration (Most comprehensive)
            async loadFromFirebase() {
                try {
                    if (!window.firebase) {
                        throw new Error('Firebase SDK not loaded');
                    }
                    
                    // Initialize Firebase (you need to add Firebase SDK to your HTML)
                    if (!firebase.apps.length) {
                        firebase.initializeApp(this.config.firebase.config);
                    }
                    
                    const database = firebase.database();
                    const ref = database.ref('portfolio-stats');
                    
                    // Get current stats
                    const snapshot = await ref.once('value');
                    const stats = snapshot.val() || {};
                    
                    // Update visitor count
                    const visitorRef = ref.child('totalVisitors');
                    const currentCount = stats.totalVisitors || 0;
                    await visitorRef.set(currentCount + 1);
                    
                    // Track additional data
                    await this.trackFirebaseData(database);
                    
                    this.updateAllCounters({
                        totalVisitors: currentCount + 1,
                        todayVisitors: stats.todayVisitors || 0,
                        pageViews: stats.pageViews || 0,
                        onlineUsers: stats.onlineUsers || 1
                    });
                    
                    console.log('✅ Firebase: Data updated');
                    
                } catch (error) {
                    console.error('Firebase Error:', error);
                    this.useFallbackCounter();
                }
            }

            async trackFirebaseData(database) {
                const today = new Date().toISOString().split('T')[0];
                const hour = new Date().getHours();
                
                // Track detailed visitor data
                const visitorData = {
                    ...this.visitorInfo,
                    date: today,
                    hour: hour
                };
                
                // Add to visitors log
                database.ref('visitors').push(visitorData);
                
                // Update today's count
                const todayRef = database.ref(`daily-stats/${today}/visitors`);
                todayRef.transaction(current => (current || 0) + 1);
                
                // Update hourly stats
                const hourlyRef = database.ref(`hourly-stats/${today}/${hour}`);
                hourlyRef.transaction(current => (current || 0) + 1);
            }

            // METHOD 3: GitHub Actions Integration (Advanced)
            async loadFromGitHub() {
                try {
                    const dataUrl = `https://raw.githubusercontent.com/${this.config.github.repo}/main/${this.config.github.dataFile}`;
                    const response = await fetch(dataUrl);
                    const data = await response.json();
                    
                    this.updateAllCounters(data);
                    
                    // Note: Updating GitHub requires authentication and Actions workflow
                    console.log('✅ GitHub: Data loaded');
                    
                } catch (error) {
                    console.error('GitHub Error:', error);
                    this.useFallbackCounter();
                }
            }

            useFallbackCounter() {
                console.log('ℹ️ Using fallback counter');
                const simulatedData = {
                    totalVisitors: this.fallbackCount + Math.floor(Math.random() * 100),
                    todayVisitors: Math.floor(Math.random() * 50) + 10,
                    pageViews: this.fallbackCount * 1.4 + Math.floor(Math.random() * 200),
                    onlineUsers: Math.floor(Math.random() * 8) + 1
                };
                this.updateAllCounters(simulatedData);
            }

            updateAllCounters(data) {
                // Animate main counter
                this.animateCounter('visitorCount', data.totalVisitors);
                
                // Update stats widgets
                document.getElementById('todayVisitors').textContent = data.todayVisitors.toLocaleString();
                document.getElementById('totalVisitors').textContent = data.totalVisitors.toLocaleString();
                document.getElementById('pageViews').textContent = data.pageViews.toLocaleString();
                document.getElementById('onlineUsers').textContent = data.onlineUsers;
                
                // Update footer
                document.getElementById('footerVisitors').textContent = data.totalVisitors.toLocaleString();
                document.getElementById('footerViews').textContent = data.pageViews.toLocaleString();
            }

            animateCounter(elementId, targetCount) {
                const element = document.getElementById(elementId);
                let currentCount = 0;
                const increment = Math.ceil(targetCount / 50);
                
                const timer = setInterval(() => {
                    currentCount += increment;
                    if (currentCount >= targetCount) {
                        element.textContent = targetCount.toLocaleString();
                        clearInterval(timer);
                        this.flashNewVisitor();
                    } else {
                        element.textContent = currentCount.toLocaleString();
                    }
                }, 40);
            }

            trackSession() {
                // Track page views in session
                this.sessionViews++;
                
                // Track time on page
                this.startTime = Date.now();
                
                window.addEventListener('beforeunload', () => {
                    const timeSpent = Math.round((Date.now() - this.startTime) / 1000);
                    
                    // Send analytics data (if using Firebase or custom endpoint)
                    if (this.config.firebase.enabled && window.firebase) {
                        firebase.database().ref('session-data').push({
                            sessionId: this.visitorInfo.sessionId,
                            timeSpent: timeSpent,
                            pageViews: this.sessionViews,
                            timestamp: new Date().toISOString()
                        });
                    }
                });
            }

            setupRealTimeUpdates() {
                // Set up periodic counter updates (every 2 minutes)
                setInterval(() => {
                    if (this.config.countapi.enabled) {
                        this.getLatestCountAPIStats();
                    }
                }, 120000);
            }

            async getLatestCountAPIStats() {
                try {
                    const namespace = this.config.countapi.namespace;
                    const response = await fetch(`${this.config.countapi.baseUrl}/get/${namespace}/visits`);
                    const data = await response.json();
                    
                    if (data.value) {
                        const currentDisplayed = parseInt(document.getElementById('visitorCount').textContent.replace(/,/g, ''));
                        if (data.value > currentDisplayed) {
                            document.getElementById('visitorCount').textContent = data.value.toLocaleString();
                            document.getElementById('totalVisitors').textContent = data.value.toLocaleString();
                            document.getElementById('footerVisitors').textContent = data.value.toLocaleString();
                            this.flashNewVisitor();
                        }
                    }
                } catch (error) {
                    console.error('Real-time update error:', error);
                }
            }

            flashNewVisitor() {
                const counter = document.getElementById('visitorCounter');
                counter.style.borderColor = 'var(--accent-primary)';
                counter.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.4)';
                counter.style.transform = 'scale(1.05)';
                
                setTimeout(() => {
                    counter.style.borderColor = 'var(--glass-border)';
                    counter.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)';
                    counter.style.transform = 'scale(1)';
                }, 2000);
            }

            // Public method to manually increment counter (for testing)
            async incrementCounter() {
                if (this.config.countapi.enabled) {
                    try {
                        const namespace = this.config.countapi.namespace;
                        const response = await fetch(`${this.config.countapi.baseUrl}/hit/${namespace}/visits`);
                        const data = await response.json();
                        if (data.value) {
                            this.updateAllCounters({
                                totalVisitors: data.value,
                                todayVisitors: Math.floor(data.value * 0.05),
                                pageViews: Math.floor(data.value * 1.4),
                                onlineUsers: Math.floor(Math.random() * 8) + 1
                            });
                        }
                    } catch (error) {
                        console.error('Manual increment error:', error);
                    }
                }
            }
        }

        // Initialize visitor counter when page loads
        const visitorCounter = new VisitorCounter();

        // Add click functionality to toggle counter visibility
        document.getElementById('visitorCounter').addEventListener('click', function() {
            const stats = document.getElementById('visitorStats');
            if (stats.style.display === 'none') {
                stats.style.display = 'block';
                stats.style.animation = 'fadeIn 0.3s ease-in-out';
            } else {
                stats.style.display = 'none';
            }
        });

        // Mobile responsiveness for counters
        function handleCounterResponsiveness() {
            const counter = document.getElementById('visitorCounter');
            const stats = document.getElementById('visitorStats');
            
            if (window.innerWidth <= 768) {
                counter.style.bottom = '1rem';
                counter.style.right = '1rem';
                stats.style.bottom = '1rem';
                stats.style.left = '1rem';
                stats.style.display = 'none'; // Hide stats on mobile by default
            } else {
                counter.style.bottom = '2rem';
                counter.style.right = '2rem';
                stats.style.bottom = '2rem';
                stats.style.left = '2rem';
                stats.style.display = 'block';
            }
        }

        window.addEventListener('resize', handleCounterResponsiveness);
        handleCounterResponsiveness(); // Call on initial load

        // Advanced Cursor Effects
        const cursor = document.querySelector('.cursor');
        const cursorFollower = document.querySelector('.cursor-follower');
        let mouseX = 0, mouseY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.style.left = mouseX + 'px';
            cursor.style.top = mouseY + 'px';
        });

        // Smooth cursor follower
        function animateFollower() {
            followerX += (mouseX - followerX) * 0.1;
            followerY += (mouseY - followerY) * 0.1;
            
            cursorFollower.style.left = followerX - 20 + 'px';
            cursorFollower.style.top = followerY - 20 + 'px';
            
            requestAnimationFrame(animateFollower);
        }
        animateFollower();

        // Cursor interactions
        const interactiveElements = document.querySelectorAll('a, button, .project-card, .skill-item');
        
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'scale(1.5)';
                cursorFollower.style.transform = 'scale(1.5)';
                cursorFollower.style.borderColor = 'var(--accent-primary)';
            });
            
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'scale(1)';
                cursorFollower.style.transform = 'scale(1)';
                cursorFollower.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            });
        });

        // Advanced Scroll Animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const fadeInObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Staggered animation for project cards
        const projectCards = document.querySelectorAll('.project-card');
        projectCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px)';
            card.style.transition = `all 0.8s ease ${index * 0.2}s`;
            fadeInObserver.observe(card);
        });

        // Skill items animation
        const skillItems = document.querySelectorAll('.skill-item');
        skillItems.forEach((skill, index) => {
            skill.style.opacity = '0';
            skill.style.transform = 'translateY(30px)';
            skill.style.transition = `all 0.6s ease ${index * 0.1}s`;
            fadeInObserver.observe(skill);
        });

        // Parallax Effects
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            // Floating shapes parallax
            const shapes = document.querySelectorAll('.shape');
            shapes.forEach((shape, index) => {
                const speed = 0.2 + (index * 0.1);
                shape.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`;
            });

            // Profile rings rotation based on scroll
            const rings = document.querySelectorAll('.profile-ring');
            rings.forEach((ring, index) => {
                ring.style.transform = `rotate(${scrolled * (0.1 + index * 0.05)}deg)`;
            });
        });

        // Header background transition
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            const scrolled = window.scrollY;
            
            if (scrolled > 100) {
                header.style.background = 'rgba(17, 24, 39, 0.95)';
                header.style.backdropFilter = 'blur(30px)';
            } else {
                header.style.background = 'rgba(17, 24, 39, 0.4)';
                header.style.backdropFilter = 'blur(20px)';
            }
        });

        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Dynamic text typing effect for hero
        const heroTitle = document.querySelector('.hero-text h1');
        const text = "Hi, I'm Alex Thompson";
        const highlight = "Alex Thompson";
        
        // Add loading animation
        window.addEventListener('load', () => {
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity 0.5s ease-in-out';
            
            setTimeout(() => {
                document.body.style.opacity = '1';
            }, 100);
        });

        // Project card 3D tilt effect
        projectCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(20px)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
            });
        });

        // Random floating particles
        function createFloatingParticle() {
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.width = Math.random() * 4 + 2 + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = `rgba(99, 102, 241, ${Math.random() * 0.5 + 0.1})`;
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.left = Math.random() * window.innerWidth + 'px';
            particle.style.top = window.innerHeight + 'px';
            particle.style.zIndex = '1';
            
            document.body.appendChild(particle);
            
            const duration = Math.random() * 3000 + 2000;
            const drift = (Math.random() - 0.5) * 100;
            
            particle.animate([
                {
                    transform: `translateY(0px) translateX(0px)`,
                    opacity: 0
                },
                {
                    transform: `translateY(-${window.innerHeight + 100}px) translateX(${drift}px)`,
                    opacity: 1
                },
                {
                    transform: `translateY(-${window.innerHeight + 200}px) translateX(${drift * 2}px)`,
                    opacity: 0
                }
            ], {
                duration: duration,
                easing: 'ease-out'
            }).onfinish = () => particle.remove();
        }

        // Create particles periodically
        setInterval(createFloatingParticle, 800);

        // Performance optimization: Reduce animations on low-end devices
        if (navigator.hardwareConcurrency <= 4) {
            document.documentElement.style.setProperty('--animation-duration', '0.3s');
        }

        // Add active navigation highlighting
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-links a');

        window.addEventListener('scroll', () => {
            let current = '';
            sections.forEach(section => {
                const sectionTop = section.offsetTop - 100;
                if (scrollY >= sectionTop) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href').slice(1) === current) {
                    link.classList.add('active');
                }
            });
        });


        const track = document.getElementById('carouselTrack');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const indicatorsContainer = document.getElementById('indicators');
        const slides = document.querySelectorAll('.carousel-slide');
        
        let currentIndex = 0;
        const totalSlides = slides.length;

        // Create indicators
        slides.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.classList.add('indicator');
            if (index === 0) indicator.classList.add('active');
            indicator.addEventListener('click', () => goToSlide(index));
            indicatorsContainer.appendChild(indicator);
        });

        const indicators = document.querySelectorAll('.indicator');

        function updateCarousel() {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            // Update indicators
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentIndex);
            });
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateCarousel();
        }

        function prevSlide() {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateCarousel();
        }

        function goToSlide(index) {
            currentIndex = index;
            updateCarousel();
        }

        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);

        // Auto-play carousel (optional)
        setInterval(nextSlide, 5000);