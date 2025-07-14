import React from 'react'

const Hero = () => {
  return (
    <div className='px-4 sm:px-20 xl:px-32 relative inline-flex flex-col w-full justify-center bg-[url(/gradientBackground.png)] bg-cover bg-no-repeat min-h-screen'>
      <div className="text-center mb-6">
        <h1 className='text-3xl sm:text-5xl md:text-6xl 2xl:text'>Create amazing contents with AI tools</h1>
        <p>Transform your content creation with our suite of premium AI tools. Write articles, generate images, and enhance your workflow.</p>
      </div>
    </div>
  )
}

export default Hero