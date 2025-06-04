import { Button } from '@/components/ui/button'
import React from 'react'
import { useNavigate } from 'react-router-dom'

const ForgetPasswordPage = () => {
  const navigate = useNavigate()
  return (
    <div className='flex flex-col gap-5 justify-center items-center h-screen bg-slate-200 dark:bg-slate-900'>
      <h1 className='text-3xl font-bold'>Forget Password Page Comming Soon!!🔜</h1>
      <Button className='ml-4' variant='outline' onClick={() => navigate("/")}>
        Go Back
      </Button>
    </div>
  )
}

export default ForgetPasswordPage
